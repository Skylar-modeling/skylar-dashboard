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
  const failedPayments = payments.filter((p) => p.paymentStatus === 'charge_failed');
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
    const failedCount = payments.filter((p) => p.paymentStatus === 'charge_failed').length;
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
        && p.paymentStatus === 'charge_failed'
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
