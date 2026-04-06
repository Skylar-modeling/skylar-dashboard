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
 * Get gross commission from PAYMENTS_LOG for a specific rep for a given month.
 * This is the real-time commission based on actual payments.
 */
export function getRepGrossCommission(data, repName, month) {
  if (!data?.PAYMENTS_LOG || !repName) return 0;

  return data.PAYMENTS_LOG
    .filter((p) => {
      if (p.paymentMonth !== month) return false;
      if (p.paymentStatus !== 'Paid') return false;
      if (String(p.refunded).toLowerCase() === 'yes') return false;
      return p.rep1 === repName || p.rep2 === repName;
    })
    .reduce((sum, p) => {
      if (p.rep1 === repName) return sum + (p.rep1Commission || 0);
      if (p.rep2 === repName) return sum + (p.rep2Commission || 0);
      return sum;
    }, 0);
}

/**
 * Get the rep's sales count and their rank for a given month/location.
 */
export function getRepSalesAndRank(data, repName, month, location) {
  if (!data?.STUDENTS_MASTER || !repName) {
    return { salesCount: 0, rank: 0, totalReps: 0 };
  }

  const students = data.STUDENTS_MASTER.filter((s) => {
    if (!s.depositDate) return false;
    if (extractYearMonth(s.depositDate) !== month) return false;
    if (location && location !== LOCATIONS.ALL && s.location !== location) return false;
    return true;
  });

  // Build ranking for all reps
  const repMap = {};
  students.forEach((s) => {
    const rep = s.salesRep1;
    if (!rep) return;
    if (!repMap[rep]) repMap[rep] = 0;
    repMap[rep] += 1;
  });

  const sorted = Object.entries(repMap)
    .sort((a, b) => b[1] - a[1]);

  const myCount = repMap[repName] || 0;
  const myIndex = sorted.findIndex(([name]) => name === repName);

  return {
    salesCount: myCount,
    rank: myIndex >= 0 ? myIndex + 1 : sorted.length + 1,
    totalReps: sorted.length,
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

    const failedCount = payments.filter((p) => p.paymentStatus === 'charge_failed').length;
    const refundedCount = payments.filter((p) => String(p.refunded).toLowerCase() === 'yes').length;

    const lastPayment = payments
      .filter((p) => p.paymentDate)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

    let status = 'Active';
    if (failedCount > 0 && (!lastPayment || lastPayment.paymentStatus === 'charge_failed')) {
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
      outstanding: Math.max(0, s.contractPrice - totalPaid),
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

    const failedCount = payments.filter((p) => p.paymentStatus === 'charge_failed').length;
    const refundedCount = payments.filter((p) => String(p.refunded).toLowerCase() === 'yes').length;

    const lastPayment = payments
      .filter((p) => p.paymentDate)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

    let status = 'Active';
    if (failedCount > 0 && (!lastPayment || lastPayment.paymentStatus === 'charge_failed')) {
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
      outstanding: Math.max(0, s.contractPrice - totalPaid),
      failedCount,
      refundedCount,
      lastPaymentDate: lastPayment?.paymentDate || null,
      status,
      depositDate: s.depositDate,
    };
  }).sort((a, b) => new Date(b.depositDate || 0) - new Date(a.depositDate || 0));
}
