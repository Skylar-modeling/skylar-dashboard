import { extractYearMonth } from './dateHelpers';
import { LOCATIONS } from '../config/constants';

/**
 * Match a Clerk user email to a sales rep record.
 * Returns the SALES_REPS row or null.
 */
export function findRepByEmail(data, email) {
  if (!data?.SALES_REPS || !email) return null;
  const lower = email.toLowerCase();
  return data.SALES_REPS.find((r) => r.email && r.email.toLowerCase() === lower) || null;
}

/**
 * Get commission data for a specific rep for a given month.
 * Uses COMMISSION_MONTHLY (pre-calculated in the sheet).
 */
export function getRepCommissionData(data, repName, month) {
  if (!data?.COMMISSION_MONTHLY || !repName) {
    return { gross: 0, actualized: 0, outstanding: 0, paid: false };
  }

  const row = data.COMMISSION_MONTHLY.find(
    (r) => r.salesRep === repName && r.month === month
  );

  if (!row) {
    return { gross: 0, actualized: 0, outstanding: 0, paid: false };
  }

  const totalCommission = row.totalCommission || 0;
  const paid = String(row.commissionPaid).toLowerCase() === 'true' ||
               String(row.commissionPaid).toLowerCase() === 'yes';

  return {
    gross: totalCommission,
    actualized: totalCommission, // Commission is calculated on payments received
    outstanding: paid ? 0 : totalCommission,
    paid,
  };
}

/**
 * Get gross commission for a specific rep for a given month.
 * Reads from COMMISSION_MONTHLY col H (pre-aggregated, cash-basis upstream).
 * PAYMENTS_LOG rep commission columns are not maintained in the sheet.
 */
export function getRepGrossCommission(data, repName, month) {
  if (!data?.COMMISSION_MONTHLY || !repName) return 0;
  return data.COMMISSION_MONTHLY
    .filter((r) => r.salesRep === repName && r.month === month)
    .reduce((sum, r) => sum + (r.totalCommission || 0), 0);
}

/**
 * Get the rep's sales count, rank, close/cancel rates, and avg deal size
 * for a given month/location. Cancelled sales are attributed to the SALE month
 * (not cancellation month) and excluded from the net sales count.
 */
export function getRepSalesAndRank(data, repName, month, location) {
  if (!data?.STUDENTS_MASTER || !repName) {
    return { salesCount: 0, rank: 0, totalReps: 0, cancellationRate: null, closeRate: null, avgDealSize: null, apptsTaken: 0 };
  }

  const students = data.STUDENTS_MASTER.filter((s) => {
    if (!s.depositDate) return false;
    if (extractYearMonth(s.depositDate) !== month) return false;
    if (location && location !== LOCATIONS.ALL && s.location !== location) return false;
    return true;
  });

  // Build ranking for all reps — non-cancelled sales only
  const repMap = {};
  const repMeta = {};
  students.forEach((s) => {
    const rep = s.salesRep1;
    if (!rep) return;
    if (!repMap[rep]) { repMap[rep] = 0; repMeta[rep] = { cancelled: 0, total: 0, revenue: 0 }; }
    const isCancelled = (s.enrollmentStatus || '').trim().toLowerCase() === 'cancelled';
    repMeta[rep].total += 1;
    if (isCancelled) {
      repMeta[rep].cancelled += 1;
      return;
    }
    repMap[rep] += 1;
    repMeta[rep].revenue += (s.recognizedRevenue || 0);
  });

  const sorted = Object.entries(repMap).sort((a, b) => b[1] - a[1]);
  const myCount = repMap[repName] || 0;
  const myIndex = sorted.findIndex(([name]) => name === repName);
  const myMeta = repMeta[repName] || { cancelled: 0, total: 0, revenue: 0 };

  // Appointments taken from REP_ACTIVITY_LOG
  let apptsTaken = 0;
  if (data.REP_ACTIVITY_LOG) {
    apptsTaken = data.REP_ACTIVITY_LOG
      .filter((r) => r.salesRep === repName && r.month === month)
      .filter((r) => !location || location === LOCATIONS.ALL || r.location === location)
      .reduce((sum, r) => sum + (r.apptsTaken || 0), 0);
  }

  return {
    salesCount: myCount,
    rank: myIndex >= 0 ? myIndex + 1 : sorted.length + 1,
    totalReps: sorted.length,
    cancelledCount: myMeta.cancelled,
    totalSold: myMeta.total,
    revenueSold: myMeta.revenue,
    apptsTaken,
    closeRate: apptsTaken > 0 ? (myCount / apptsTaken) * 100 : null,
    cancellationRate: myMeta.total > 0 ? (myMeta.cancelled / myMeta.total) * 100 : null,
    avgDealSize: myCount > 0 ? myMeta.revenue / myCount : null,
  };
}

/**
 * Get the rep's clients with payment status for a given month.
 * Returns students sold by this rep with their latest payment info.
 */
export function getRepClients(data, repName, month) {
  if (!data?.STUDENTS_MASTER || !repName) return [];

  const students = data.STUDENTS_MASTER.filter((s) => {
    if (extractYearMonth(s.depositDate) !== month) return false;
    return s.salesRep1 === repName || s.salesRep2 === repName;
  });

  return students.map((s) => {
    // Find all payments for this student
    const payments = (data.PAYMENTS_LOG || []).filter(
      (p) => p.studentEmail && s.email && p.studentEmail.toLowerCase() === s.email.toLowerCase()
    );

    const totalPaid = payments
      .filter((p) => p.paymentStatus === 'Paid' && String(p.refunded).toLowerCase() !== 'yes')
      .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);

    const failedCount = payments.filter((p) => {
      const s = (p.paymentStatus || '').toLowerCase();
      return s === 'charge_failed' || s === 'charge.failed';
    }).length;
    const refundedCount = payments.filter((p) => String(p.refunded).toLowerCase() === 'yes').length;

    const lastPayment = payments
      .filter((p) => p.paymentDate)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

    let status = 'Active';
    if (failedCount > 0 && (!lastPayment || /^charge[._]failed$/i.test(lastPayment.paymentStatus || ''))) {
      status = 'Failed';
    }
    if (refundedCount > 0) {
      status = 'Dispute';
    }

    return {
      name: s.fullName,
      email: s.email,
      program: s.program,
      location: s.location,
      contractPrice: s.contractPrice,
      totalPaid,
      // Prefer AL (AdjustedBalanceOwed) — cancellation-aware. contractPrice (M) stays as the "Contract" column for gross sold.
      outstanding: s.adjustedBalanceOwed != null ? s.adjustedBalanceOwed : Math.max(0, s.contractPrice - totalPaid),
      failedCount,
      refundedCount,
      lastPaymentDate: lastPayment?.paymentDate || null,
      lastPaymentStatus: lastPayment?.paymentStatus || null,
      status,
    };
  });
}

/**
 * Get all-time client list for a rep (not month-filtered).
 */
export function getRepAllClients(data, repName) {
  if (!data?.STUDENTS_MASTER || !repName) return [];

  const students = data.STUDENTS_MASTER.filter(
    (s) => s.salesRep1 === repName || s.salesRep2 === repName
  );

  return students.map((s) => {
    const payments = (data.PAYMENTS_LOG || []).filter(
      (p) => p.studentEmail && s.email && p.studentEmail.toLowerCase() === s.email.toLowerCase()
    );

    const totalPaid = payments
      .filter((p) => p.paymentStatus === 'Paid' && String(p.refunded).toLowerCase() !== 'yes')
      .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);

    const failedCount = payments.filter((p) => {
      const s = (p.paymentStatus || '').toLowerCase();
      return s === 'charge_failed' || s === 'charge.failed';
    }).length;
    const refundedCount = payments.filter((p) => String(p.refunded).toLowerCase() === 'yes').length;

    const lastPayment = payments
      .filter((p) => p.paymentDate)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

    let status = 'Active';
    if (failedCount > 0 && (!lastPayment || /^charge[._]failed$/i.test(lastPayment.paymentStatus || ''))) {
      status = 'Failed';
    }
    if (refundedCount > 0) {
      status = 'Dispute';
    }

    return {
      name: s.fullName,
      email: s.email,
      program: s.program,
      location: s.location,
      contractPrice: s.contractPrice,
      totalPaid,
      // Prefer AL (AdjustedBalanceOwed) — cancellation-aware. contractPrice (M) stays as the "Contract" column for gross sold.
      outstanding: s.adjustedBalanceOwed != null ? s.adjustedBalanceOwed : Math.max(0, s.contractPrice - totalPaid),
      failedCount,
      refundedCount,
      lastPaymentDate: lastPayment?.paymentDate || null,
      status,
      depositDate: s.depositDate,
    };
  }).sort((a, b) => new Date(b.depositDate || 0) - new Date(a.depositDate || 0));
}
