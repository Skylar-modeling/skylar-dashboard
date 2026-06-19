/**
 * Student-level calculations for the search feature.
 * Derives amount paid, outstanding balance, late fees, and payment history
 * from STUDENTS_MASTER and PAYMENTS_LOG data.
 */
import { PROGRAMS } from '../config/constants';

// Normalize a free-text program value to the canonical name from PROGRAMS,
// so a sheet typo like "photoshoot" still buckets under "Photoshoot".
function normalizeProgram(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  return PROGRAMS.find((p) => p.toLowerCase() === lower) || trimmed;
}

// PAYMENTS_LOG has two failure status formats in the wild:
//   "charge_failed" — older normalized format
//   "charge.failed" — newer raw Stripe webhook event type
// Single source of truth so every caller catches both.
export function isFailedPayment(p) {
  const s = (p?.paymentStatus || '').toLowerCase();
  return s === 'charge_failed' || s === 'charge.failed';
}

// Stripe dispute lifecycle events (also from raw webhooks)
export function isDisputeEvent(p) {
  const s = (p?.paymentStatus || '').toLowerCase();
  return s.startsWith('charge.dispute.');
}

export function getStudentRecord(data, student) {
  if (!data?.PAYMENTS_LOG) {
    return {
      ...student,
      amountPaid: 0,
      // Prefer AL (AdjustedBalanceOwed) — cancellation-aware. Falls back to contract price for old data.
      amountOutstanding: student.adjustedBalanceOwed != null ? student.adjustedBalanceOwed : student.contractPrice,
      lateFees: 0,
      failedPayments: 0,
      payments: [],
    };
  }

  // Match payments by email (most reliable) or student ID
  const payments = data.PAYMENTS_LOG.filter(
    (p) =>
      (student.email && p.studentEmail && p.studentEmail.toLowerCase() === student.email.toLowerCase()) ||
      (student.studentId && p.studentId && p.studentId === student.studentId)
  );

  // Sort payments by date descending (newest first)
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = a.paymentDate ? new Date(a.paymentDate) : new Date(0);
    const dateB = b.paymentDate ? new Date(b.paymentDate) : new Date(0);
    return dateB - dateA;
  });

  const successfulPayments = payments.filter((p) => p.paymentStatus === 'Paid' && p.refunded !== 'Yes');
  const failedPayments = payments.filter(isFailedPayment);
  const refundedPayments = payments.filter((p) => p.refunded === 'Yes');

  const amountPaid = successfulPayments.reduce((sum, p) => sum + p.paymentAmount, 0);
  const refundedAmount = refundedPayments.reduce((sum, p) => sum + p.paymentAmount, 0);
  const netPaid = amountPaid - refundedAmount;
  // Use AL (AdjustedBalanceOwed) — 0 when student is Cancelled, M−W otherwise.
  // Falls back to the derived calc if the sheet column hasn't been populated yet.
  const amountOutstanding = student.adjustedBalanceOwed != null
    ? student.adjustedBalanceOwed
    : Math.max(0, student.contractPrice - netPaid);

  return {
    ...student,
    amountPaid: netPaid,
    amountOutstanding,
    lateFees: failedPayments.length, // Count of failed payment attempts
    failedPayments: failedPayments.length,
    payments: sortedPayments,
  };
}

/**
 * All students with Outstanding > $0, enriched with derived fields and sorted
 * by Start Date ascending (earliest first). Cancelled students are naturally
 * excluded because AL (AdjustedBalanceOwed) is forced to $0 by the sheet formula.
 *
 * Returned rows include everything from the raw STUDENTS_MASTER row plus:
 *  - paid: totalCollected (col W)
 *  - outstanding: adjustedBalanceOwed (col AL)
 *  - failedCount: number of charge_failed payments in PAYMENTS_LOG
 *  - lastPaymentDate: most recent successful Paid payment date (or null)
 */
export function getOpenAccounts(data, location) {
  if (!data?.STUDENTS_MASTER) return [];

  let students = data.STUDENTS_MASTER.filter((s) => (s.adjustedBalanceOwed || 0) > 0);
  if (location && location !== 'ALL') {
    students = students.filter((s) => s.location === location);
  }

  return students.map((s) => {
    const payments = (data.PAYMENTS_LOG || []).filter(
      (p) => p.studentEmail && s.email && p.studentEmail.toLowerCase() === s.email.toLowerCase()
    );
    const failedCount = payments.filter(isFailedPayment).length;
    const lastPayment = payments
      .filter((p) => p.paymentStatus === 'Paid' && p.paymentDate)
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))[0];

    return {
      ...s,
      paid: s.totalCollected || 0,
      outstanding: s.adjustedBalanceOwed || 0,
      failedCount,
      lastPaymentDate: lastPayment?.paymentDate || null,
    };
  }).sort((a, b) => {
    // Default sort: Start Date ascending. Blank/missing dates go last so they
    // don't crowd the action-needed rows at the top.
    const aDate = a.startDate || '';
    const bDate = b.startDate || '';
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
}

/**
 * Group students into class cohorts for the per-cohort roster view.
 *
 * Cohort rules:
 *  - 8 Weeks / Model Weekend / Photoshoot: one cohort per (program, location, startDate)
 *  - Online Program: rolling — one cohort per (location, sale-month from depositDate)
 *
 * Each student carries a `paymentStatus`:
 *  - "paid"      → outstanding ≤ 0 and no failed charges
 *  - "ontrack"   → outstanding > 0, no failed charges (on payment plan)
 *  - "attention" → outstanding > 0 AND at least one failed charge
 *  - "cancelled" → enrollmentStatus === "Cancelled"
 *
 * Returns an array of cohort objects sorted by date descending (most recent first).
 */
export function getCohorts(data, location) {
  if (!data?.STUDENTS_MASTER) return [];

  let students = data.STUDENTS_MASTER;
  if (location && location !== 'ALL') {
    students = students.filter((s) => s.location === location);
  }
  // Skip rows with no program
  students = students.filter((s) => (s.program || '').trim());

  const cohorts = new Map();

  students.forEach((s) => {
    const program = normalizeProgram(s.program);
    const isOnline = program === 'Online Program';

    // Cohort key: program + location + (startDate OR sale-month for Online)
    let groupKey;
    let label;
    if (isOnline) {
      const month = (s.depositDate || '').slice(0, 7);
      if (!month) return; // skip if we can't bucket it
      groupKey = `${program}|${s.location}|${month}`;
      label = month; // YYYY-MM for sort + display
    } else {
      const start = (s.startDate || '').slice(0, 10);
      if (!start) return; // skip if no start date
      groupKey = `${program}|${s.location}|${start}`;
      label = start; // YYYY-MM-DD for sort + display
    }

    if (!cohorts.has(groupKey)) {
      cohorts.set(groupKey, {
        program,
        location: s.location,
        isOnline,
        startDate: isOnline ? null : label,
        endDate: isOnline ? null : (s.endDate || '').slice(0, 10) || null,
        saleMonth: isOnline ? label : null,
        sortKey: label,
        students: [],
      });
    }

    // Per-student payment status
    const outstanding = s.adjustedBalanceOwed || 0;
    const cancelled = (s.enrollmentStatus || '').trim().toLowerCase() === 'cancelled';
    const failedCount = (data.PAYMENTS_LOG || []).filter(
      (p) => p.studentEmail && s.email
        && p.studentEmail.toLowerCase() === s.email.toLowerCase()
        && isFailedPayment(p)
    ).length;

    let paymentStatus;
    if (cancelled) paymentStatus = 'cancelled';
    else if (outstanding <= 0) paymentStatus = 'paid';
    else if (failedCount > 0) paymentStatus = 'attention';
    else paymentStatus = 'ontrack';

    cohorts.get(groupKey).students.push({
      ...s,
      outstanding,
      failedCount,
      paymentStatus,
    });
  });

  // Sort cohorts by date descending (most recent / upcoming first)
  return Array.from(cohorts.values()).sort((a, b) => (b.sortKey || '').localeCompare(a.sortKey || ''));
}

// Days back from "now" we consider for the dunning views. Older invoices are
// either resolved or abandoned and would just be noise.
const REPEAT_FAILURE_RECENCY_DAYS = 30;
const DUNNING_RECENCY_DAYS = 30;

/**
 * Full dunning worklist — every invoice whose latest failed-charge attempt is
 * within the last 30 days, including 1st-strike failures (the inbox card only
 * surfaces 2+ strikes). Sorted by attempt count desc, then most-recent attempt.
 */
export function getDunningList(data, location) {
  if (!data?.PAYMENTS_LOG || !data?.STUDENTS_MASTER) return [];

  const byInvoice = new Map();
  data.PAYMENTS_LOG.forEach((p) => {
    if (!isFailedPayment(p)) return;
    if (!p.stripeInvoiceId) return;
    if (location && location !== 'ALL' && p.location && p.location !== location) return;
    const arr = byInvoice.get(p.stripeInvoiceId) || [];
    arr.push(p);
    byInvoice.set(p.stripeInvoiceId, arr);
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DUNNING_RECENCY_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const out = [];
  byInvoice.forEach((attempts, invoiceId) => {
    const sorted = [...attempts].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
    const lastDate = (sorted[0].paymentDate || '').slice(0, 10);
    if (lastDate < cutoffStr) return;

    const firstDate = (sorted[sorted.length - 1].paymentDate || '').slice(0, 10);
    const email = attempts[0].studentEmail || '';
    const student = data.STUDENTS_MASTER.find(
      (s) => s.email && email && s.email.toLowerCase() === email.toLowerCase()
    );
    if (location && location !== 'ALL' && student && student.location !== location) return;

    // Days delinquent = days since the first failed attempt on this invoice
    const daysDelinquent = firstDate
      ? Math.floor((Date.now() - new Date(firstDate).getTime()) / 86400000)
      : null;

    out.push({
      invoiceId,
      invoiceNumber: sorted[0].invoiceNumber || '',
      studentName: student?.fullName || email,
      studentEmail: email,
      program: student?.program || '',
      studentLocation: student?.location || sorted[0].location || '',
      attemptCount: attempts.length,
      firstAttemptDate: firstDate,
      lastAttemptDate: lastDate,
      daysDelinquent,
      lastAmount: sorted[0].paymentAmount || 0,
      student,
    });
  });

  return out.sort((a, b) => {
    if (b.attemptCount !== a.attemptCount) return b.attemptCount - a.attemptCount;
    return (b.lastAttemptDate || '').localeCompare(a.lastAttemptDate || '');
  });
}

/**
 * Detect "repeat-failure" invoices: same Stripe Invoice ID with 2+ charge_failed
 * attempts in PAYMENTS_LOG AND a recent latest attempt. These are the dunning
 * cases where Stripe is still retrying — the highest-priority involuntary-churn
 * signal. Stale retries (last attempt > 30 days ago) are filtered out as noise.
 *
 * Returns one entry per failing invoice, enriched with the student record so
 * the row click can open StudentDetail.
 */
export function getRepeatedFailures(data, location) {
  if (!data?.PAYMENTS_LOG || !data?.STUDENTS_MASTER) return [];

  // Group failed charges by invoice ID
  const byInvoice = new Map();
  data.PAYMENTS_LOG.forEach((p) => {
    if (!isFailedPayment(p)) return;
    if (!p.stripeInvoiceId) return;
    if (location && location !== 'ALL' && p.location && p.location !== location) return;

    const arr = byInvoice.get(p.stripeInvoiceId) || [];
    arr.push(p);
    byInvoice.set(p.stripeInvoiceId, arr);
  });

  // Recency cutoff — compare against ISO date strings (lexicographic compare works)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REPEAT_FAILURE_RECENCY_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const out = [];
  byInvoice.forEach((attempts, invoiceId) => {
    if (attempts.length < 2) return;

    const sorted = [...attempts].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
    const lastDate = (sorted[0].paymentDate || '').slice(0, 10);
    if (lastDate < cutoffStr) return; // stale — skip

    // Find the student by email
    const email = attempts[0].studentEmail || '';
    const student = data.STUDENTS_MASTER.find(
      (s) => s.email && email && s.email.toLowerCase() === email.toLowerCase()
    );
    if (location && location !== 'ALL' && student && student.location !== location) return;

    out.push({
      invoiceId,
      invoiceNumber: sorted[0].invoiceNumber || '',
      studentName: student?.fullName || email,
      studentEmail: email,
      attemptCount: attempts.length,
      lastAttemptDate: sorted[0].paymentDate || '',
      lastAmount: sorted[0].paymentAmount || 0,
      student, // attached so the row click can open detail
    });
  });

  // Most attempts first; tie-break by most recent failure
  return out.sort((a, b) => {
    if (b.attemptCount !== a.attemptCount) return b.attemptCount - a.attemptCount;
    return (b.lastAttemptDate || '').localeCompare(a.lastAttemptDate || '');
  });
}

/**
 * Cancelled students who had a successful payment AFTER their cancellation date.
 * That's a chargeback waiting to happen — the customer was billed past the cancel.
 */
export function getCancelledButBilled(data, location) {
  if (!data?.STUDENTS_MASTER || !data?.PAYMENTS_LOG) return [];

  const cancelled = data.STUDENTS_MASTER.filter((s) => {
    const status = (s.enrollmentStatus || '').trim().toLowerCase();
    if (status !== 'cancelled') return false;
    if (!s.cancellationDate) return false; // need a cancel date to compare against
    if (location && location !== 'ALL' && s.location !== location) return false;
    return true;
  });

  const out = [];
  cancelled.forEach((s) => {
    const cancelDate = (s.cancellationDate || '').slice(0, 10);
    if (!cancelDate) return;
    const postCancel = data.PAYMENTS_LOG.filter((p) => {
      if (p.paymentStatus !== 'Paid') return false;
      if (String(p.refunded).toLowerCase() === 'yes') return false;
      if (!p.studentEmail || !s.email) return false;
      if (p.studentEmail.toLowerCase() !== s.email.toLowerCase()) return false;
      const pDate = (p.paymentDate || '').slice(0, 10);
      return pDate > cancelDate;
    });
    if (postCancel.length === 0) return;

    const total = postCancel.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    out.push({
      studentName: s.fullName,
      studentEmail: s.email,
      cancellationDate: cancelDate,
      postCancelCount: postCancel.length,
      postCancelTotal: total,
      lastChargeDate: postCancel.map((p) => p.paymentDate).sort().pop(),
      student: s,
    });
  });

  // Most recent charge-after-cancel first
  return out.sort((a, b) => (b.lastChargeDate || '').localeCompare(a.lastChargeDate || ''));
}

/**
 * Accounts Receivable aging — bucket every open account by how stale the
 * student's last successful payment is, relative to a 30-day expected cadence.
 *
 *   Current   = last payment within 30 days (not overdue)
 *   1-30      = 31-60 days since last payment (~1 missed cycle)
 *   31-60     = 61-90
 *   61-90     = 91-120
 *   90+       = 121+ days since last payment
 *
 * For students with no successful payment ever (deposit only), the deposit
 * date is used as the "last activity" anchor instead.
 *
 * Returns an array of 5 buckets in age order with { key, label, count, total, students }.
 */
export function getARAging(data, location) {
  if (!data?.STUDENTS_MASTER) {
    return [
      { key: 'current', label: 'Current', count: 0, total: 0, students: [] },
      { key: 'b1_30',   label: '1–30 days',  count: 0, total: 0, students: [] },
      { key: 'b31_60',  label: '31–60 days', count: 0, total: 0, students: [] },
      { key: 'b61_90',  label: '61–90 days', count: 0, total: 0, students: [] },
      { key: 'b90plus', label: '90+ days',   count: 0, total: 0, students: [] },
    ];
  }

  const todayMs = Date.now();
  const openStudents = data.STUDENTS_MASTER.filter((s) => {
    if ((s.adjustedBalanceOwed || 0) <= 0) return false;
    if (location && location !== 'ALL' && s.location !== location) return false;
    return true;
  });

  const buckets = {
    current: { key: 'current', label: 'Current',    count: 0, total: 0, students: [] },
    b1_30:   { key: 'b1_30',   label: '1–30 days',  count: 0, total: 0, students: [] },
    b31_60:  { key: 'b31_60',  label: '31–60 days', count: 0, total: 0, students: [] },
    b61_90:  { key: 'b61_90',  label: '61–90 days', count: 0, total: 0, students: [] },
    b90plus: { key: 'b90plus', label: '90+ days',   count: 0, total: 0, students: [] },
  };

  openStudents.forEach((s) => {
    // Anchor = last successful Paid payment, else deposit date, else now (treat as Current)
    const paidDates = (data.PAYMENTS_LOG || [])
      .filter((p) => p.studentEmail && s.email && p.studentEmail.toLowerCase() === s.email.toLowerCase())
      .filter((p) => p.paymentStatus === 'Paid' && p.paymentDate)
      .map((p) => p.paymentDate)
      .sort();
    const anchor = paidDates.length > 0 ? paidDates[paidDates.length - 1] : s.depositDate;
    let daysSince = 0;
    if (anchor) {
      const t = Date.parse(anchor);
      if (!isNaN(t)) daysSince = Math.floor((todayMs - t) / 86400000);
    }

    let bucket;
    if (daysSince <= 30) bucket = 'current';
    else if (daysSince <= 60) bucket = 'b1_30';
    else if (daysSince <= 90) bucket = 'b31_60';
    else if (daysSince <= 120) bucket = 'b61_90';
    else bucket = 'b90plus';

    buckets[bucket].count += 1;
    buckets[bucket].total += (s.adjustedBalanceOwed || 0);
    buckets[bucket].students.push({ ...s, daysSinceLastPayment: daysSince });
  });

  return [buckets.current, buckets.b1_30, buckets.b31_60, buckets.b61_90, buckets.b90plus];
}

/**
 * Detect accounts in contradictory / stuck status states. These are the
 * silent bookkeeping bugs that cause disputes weeks later.
 *
 * Issue types:
 *   "no-cancel-date"        — enrollmentStatus = Cancelled but Cancellation Date is blank
 *   "date-no-cancel-status" — Cancellation Date set but enrollmentStatus is NOT Cancelled
 *   "billed-after-cancel"   — Successful charge fired after Cancellation Date
 *                             (same case the inbox surfaces, included here for the full audit list)
 *   "unknown-status"        — enrollmentStatus is non-blank but not a recognized value
 */
const RECOGNIZED_STATUSES = ['active', 'cancelled', 'completed', 'paused', 'pending'];

export function getStaleStatusItems(data, location) {
  if (!data?.STUDENTS_MASTER) return [];

  const out = [];
  const students = data.STUDENTS_MASTER.filter((s) => {
    if (location && location !== 'ALL' && s.location !== location) return false;
    return true;
  });

  students.forEach((s) => {
    const statusRaw = (s.enrollmentStatus || '').trim();
    const status = statusRaw.toLowerCase();
    const cancelDate = (s.cancellationDate || '').slice(0, 10);

    // 1. Cancelled status but no cancellation date
    if (status === 'cancelled' && !cancelDate) {
      out.push({
        type: 'no-cancel-date',
        label: 'Cancelled · no date',
        severity: 'amber',
        student: s,
        studentName: s.fullName,
        detail: 'Status is Cancelled but Cancellation Date is blank — fill it so billing logic can lock.',
      });
    }

    // 2. Cancellation Date present but status isn't Cancelled
    if (cancelDate && status !== 'cancelled') {
      out.push({
        type: 'date-no-cancel-status',
        label: 'Date set · status mismatched',
        severity: 'amber',
        student: s,
        studentName: s.fullName,
        detail: `Cancellation Date = ${cancelDate} but Enrollment Status = "${statusRaw || 'blank'}".`,
      });
    }

    // 3. Cancelled AND a Paid charge fired after the cancellation date
    if (status === 'cancelled' && cancelDate && s.email) {
      const postCancel = (data.PAYMENTS_LOG || []).filter((p) => {
        if (p.paymentStatus !== 'Paid') return false;
        if (String(p.refunded).toLowerCase() === 'yes') return false;
        if (!p.studentEmail || p.studentEmail.toLowerCase() !== s.email.toLowerCase()) return false;
        return (p.paymentDate || '').slice(0, 10) > cancelDate;
      });
      if (postCancel.length > 0) {
        const lastDate = postCancel.map((p) => p.paymentDate).sort().pop();
        const total = postCancel.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        out.push({
          type: 'billed-after-cancel',
          label: 'Billed after cancel',
          severity: 'red',
          student: s,
          studentName: s.fullName,
          detail: `${postCancel.length} charge${postCancel.length !== 1 ? 's' : ''} (${formatCurrencyShort(total)}) after Cancellation Date ${cancelDate}. Last charge ${(lastDate || '').slice(0, 10)}.`,
        });
      }
    }

    // 4. Non-blank but not in the known vocabulary
    if (statusRaw && !RECOGNIZED_STATUSES.includes(status)) {
      out.push({
        type: 'unknown-status',
        label: 'Unknown status',
        severity: 'amber',
        student: s,
        studentName: s.fullName,
        detail: `Enrollment Status = "${statusRaw}" — not in the expected vocabulary (Active / Cancelled / Completed / Paused / Pending).`,
      });
    }
  });

  // Severity sort: red first, then amber
  const sevOrder = { red: 0, amber: 1, gray: 2 };
  return out.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]) || a.studentName.localeCompare(b.studentName));
}

// Local helper — avoid importing the formatter into a util that's already deep in the import graph
function formatCurrencyShort(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Detect open / recent Stripe disputes.
 * Disputes are real money risk — Stripe pulls funds when one is opened, and
 * if not won within the deadline (~20 days), you lose the money + a fee.
 *
 * Rule: any dispute event in the last 90 days (created, funds_withdrawn, etc.)
 * surfaces here unless a "charge.dispute.closed" exists for the same charge
 * (same paymentId or stripeInvoiceId) at a later date — that means resolved.
 */
const DISPUTE_WINDOW_DAYS = 90;

export function getOpenDisputes(data, location) {
  if (!data?.PAYMENTS_LOG || !data?.STUDENTS_MASTER) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DISPUTE_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Walk all dispute events and bucket by a stable charge key
  const events = [];
  data.PAYMENTS_LOG.forEach((p) => {
    if (!isDisputeEvent(p)) return;
    if (location && location !== 'ALL' && p.location && p.location !== location) return;
    const key = p.stripeInvoiceId || p.paymentId;
    if (!key) return;
    events.push({ ...p, key, date: (p.paymentDate || '').slice(0, 10) });
  });

  // Group by charge key; track if a "closed" event exists at or after the latest other event
  const byKey = new Map();
  events.forEach((e) => {
    const bucket = byKey.get(e.key) || { events: [], hasClosed: false };
    bucket.events.push(e);
    if (e.paymentStatus.toLowerCase() === 'charge.dispute.closed') bucket.hasClosed = true;
    byKey.set(e.key, bucket);
  });

  const out = [];
  byKey.forEach((bucket, key) => {
    if (bucket.hasClosed) return; // resolved
    const sorted = [...bucket.events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latest = sorted[0];
    if ((latest.date || '') < cutoffStr) return; // too old to act on

    const email = latest.studentEmail || '';
    const student = data.STUDENTS_MASTER.find(
      (s) => s.email && email && s.email.toLowerCase() === email.toLowerCase()
    );

    out.push({
      key,
      studentName: student?.fullName || email || 'Unknown',
      studentEmail: email,
      latestEvent: latest.paymentStatus,
      latestDate: latest.date,
      amount: latest.paymentAmount || 0,
      student,
    });
  });

  return out.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));
}

/**
 * Recent activity feed — every notable event in the last `days` days,
 * merged from STUDENTS_MASTER (enrollments, cancellations) and PAYMENTS_LOG
 * (paid charges, failed charges, refunds, dispute lifecycle). Sorted
 * reverse-chronological (most recent first), capped at 100 events.
 *
 * Each event = { date, type, label, severity, studentName, studentEmail, amount, student }
 */
export function getRecentActivity(data, location, days = 7) {
  if (!data) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const events = [];

  const findStudentByEmail = (email) => {
    if (!email || !data.STUDENTS_MASTER) return null;
    return data.STUDENTS_MASTER.find(
      (s) => s.email && s.email.toLowerCase() === email.toLowerCase()
    ) || null;
  };

  // Enrollments and cancellations from STUDENTS_MASTER
  (data.STUDENTS_MASTER || []).forEach((s) => {
    if (location && location !== 'ALL' && s.location !== location) return;

    const depDate = (s.depositDate || '').slice(0, 10);
    if (depDate && depDate >= cutoffStr) {
      events.push({
        date: depDate,
        type: 'enrollment',
        label: 'New enrollment',
        severity: 'green',
        studentName: s.fullName,
        studentEmail: s.email,
        amount: s.contractPrice || 0,
        student: s,
      });
    }

    const cancDate = (s.cancellationDate || '').slice(0, 10);
    if (cancDate && cancDate >= cutoffStr) {
      events.push({
        date: cancDate,
        type: 'cancellation',
        label: 'Cancellation',
        severity: 'amber',
        studentName: s.fullName,
        studentEmail: s.email,
        amount: 0,
        student: s,
      });
    }
  });

  // Payment events from PAYMENTS_LOG
  (data.PAYMENTS_LOG || []).forEach((p) => {
    const pDate = (p.paymentDate || '').slice(0, 10);
    if (!pDate || pDate < cutoffStr) return;
    if (location && location !== 'ALL' && p.location && p.location !== location) return;

    const student = findStudentByEmail(p.studentEmail);
    if (location && location !== 'ALL' && student && student.location !== location) return;
    const name = student?.fullName || p.studentEmail || '(unknown)';

    if (isFailedPayment(p)) {
      events.push({
        date: pDate, type: 'failed', label: 'Failed charge', severity: 'red',
        studentName: name, studentEmail: p.studentEmail, amount: p.paymentAmount || 0, student,
      });
    } else if (isDisputeEvent(p)) {
      const lifecycle = p.paymentStatus.replace('charge.dispute.', '');
      events.push({
        date: pDate, type: 'dispute', label: `Dispute · ${lifecycle}`, severity: 'red',
        studentName: name, studentEmail: p.studentEmail, amount: p.paymentAmount || 0, student,
      });
    } else if ((p.paymentStatus || '').toLowerCase() === 'paid' && String(p.refunded).toLowerCase() !== 'yes') {
      events.push({
        date: pDate, type: 'paid', label: 'Paid charge', severity: 'green',
        studentName: name, studentEmail: p.studentEmail, amount: p.paymentAmount || 0, student,
      });
    } else if ((p.paymentStatus || '').toLowerCase() === 'refunded' || String(p.refunded).toLowerCase() === 'yes' || (p.paymentStatus || '').toLowerCase() === 'charge.refunded') {
      events.push({
        date: pDate, type: 'refunded', label: 'Refund', severity: 'amber',
        studentName: name, studentEmail: p.studentEmail, amount: p.paymentAmount || 0, student,
      });
    }
  });

  return events
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 100);
}

/**
 * Monthly Sales Overview — group every student by Deposit Date month
 * (YYYY-MM) and aggregate by location. Used by the side-drawer reconciliation
 * view. Cancelled students are NOT filtered out (the prompt wants them counted
 * toward the month they were sold). Rows where Deposit Date is blank are skipped.
 *
 * Returns months sorted newest-first. Each month entry:
 *   { month, nySales, miamiSales, nyTotal, miamiTotal, refunds, netSold, students }
 *
 * Primary money column is Contract Price (col M) per the prompt — NOT
 * Recognized Revenue (this is a "what was sold" reconciliation view).
 */
export function getMonthlySalesOverview(data) {
  if (!data?.STUDENTS_MASTER) return [];

  const byMonth = new Map();

  data.STUDENTS_MASTER.forEach((s) => {
    const month = (s.depositDate || '').slice(0, 7);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return; // skip blank / malformed

    if (!byMonth.has(month)) {
      byMonth.set(month, {
        month,
        nySales: 0,
        miamiSales: 0,
        nyTotal: 0,
        miamiTotal: 0,
        refunds: 0,
        netSold: 0,
        students: [],
      });
    }
    const entry = byMonth.get(month);
    const contract = s.contractPrice || 0;
    const refund = s.refundAmount || 0;

    if (s.location === 'New York') {
      entry.nySales += 1;
      entry.nyTotal += contract;
    } else if (s.location === 'Miami') {
      entry.miamiSales += 1;
      entry.miamiTotal += contract;
    }
    entry.refunds += refund;

    entry.students.push({
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      location: s.location,
      contractPrice: contract,
      refundAmount: refund,
      recognizedRevenue: s.recognizedRevenue || 0,
      enrollmentStatus: (s.enrollmentStatus || '').trim() || 'Active',
    });
  });

  // Net Sold and sort students within each month
  byMonth.forEach((entry) => {
    entry.netSold = entry.nyTotal + entry.miamiTotal - entry.refunds;
    entry.students.sort((a, b) => {
      const locA = a.location || '';
      const locB = b.location || '';
      if (locA !== locB) return locA.localeCompare(locB);
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  });

  return Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month));
}

export function searchStudents(data, query, location) {
  if (!data?.STUDENTS_MASTER || !query || query.trim().length < 2 || query.trim().length > 50) return [];

  const q = query.trim().toLowerCase();

  let students = data.STUDENTS_MASTER;

  // Filter by location if provided (for manager view)
  if (location && location !== 'ALL') {
    students = students.filter((s) => s.location === location);
  }

  // Search by name, payer email (col C), student email (col AN), or phone
  const queryDigits = q.replace(/\D/g, '');

  // Two-pass so payer-email matches rank above student-email-only matches when both exist.
  const payerOrOther = students.filter((s) => {
    const name = (s.fullName || '').toLowerCase();
    const email = (s.email || '').trim().toLowerCase();
    const phone = (s.phone || '').replace(/\D/g, '');
    return (
      name.includes(q) ||
      email.includes(q) ||
      (queryDigits.length >= 3 && phone.includes(queryDigits))
    );
  });
  const studentEmailOnly = students.filter((s) => {
    if (payerOrOther.includes(s)) return false;
    const se = (s.studentEmail || '').trim().toLowerCase();
    return se && se.includes(q);
  });

  return [...payerOrOther, ...studentEmailOnly].slice(0, 20);
}
