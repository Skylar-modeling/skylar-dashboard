import { extractYearMonth } from './dateHelpers';
import { LOCATIONS } from '../config/constants';

function filterByLocation(rows, location, locationField = 'location') {
  if (!location || location === LOCATIONS.ALL) return rows;
  return rows.filter((r) => r[locationField] === location);
}

function filterByMonth(rows, month, monthField) {
  if (!month) return rows;
  return rows.filter((r) => {
    const val = r[monthField];
    if (!val) return false;
    // If the field is a full date, extract month; if already YYYY-MM, compare directly
    const extracted = extractYearMonth(val);
    return extracted === month;
  });
}

// ─── Section 1: Revenue & Sales ───

export function getRevenueSales(data, month, location) {
  if (!data?.STUDENTS_MASTER) return 0;
  let rows = data.STUDENTS_MASTER;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => extractYearMonth(r.depositDate) === month);
  // Use AK (Recognized Revenue) — cancellation-aware (falls back to Total Collected when Cancelled)
  return rows.reduce((sum, r) => sum + (r.recognizedRevenue || 0), 0);
}

export function getSalesCount(data, month, location) {
  if (!data?.STUDENTS_MASTER) return 0;
  let rows = data.STUDENTS_MASTER;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => extractYearMonth(r.depositDate) === month);
  return rows.length;
}

export function getAverageDealSize(data, month, location) {
  const revenue = getRevenueSales(data, month, location);
  const count = getSalesCount(data, month, location);
  if (count === 0) return null;
  return revenue / count;
}

export function getActualizedRevenue(data, month, location) {
  if (!data?.ACTUALIZED_REVENUE) return 0;
  let rows = data.ACTUALIZED_REVENUE;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => r.month === month);
  return rows.reduce((sum, r) => sum + r.actualizedRevenue, 0);
}

// ─── Section 2: Profitability ───

export function getTotalExpenses(data, month, location, isManager = false) {
  if (!data?.MONTHLY_EXPENSES) return 0;
  let rows = data.MONTHLY_EXPENSES.filter((r) => r.month === month);
  if (location && location !== LOCATIONS.ALL) {
    if (isManager) {
      // Manager: only their location's expenses (exclude company-wide)
      rows = rows.filter((r) => r.location === location);
    } else {
      // CEO filtered: location-specific + company-wide (blank)
      rows = rows.filter((r) => r.location === location || !r.location);
    }
  }
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

export function getProfit(data, month, location, isManager = false) {
  return getActualizedRevenue(data, month, location) - getTotalExpenses(data, month, location, isManager);
}

export function getProfitMargin(data, month, location, isManager = false) {
  const rev = getActualizedRevenue(data, month, location);
  if (rev === 0) return null;
  return (getProfit(data, month, location, isManager) / rev) * 100;
}

export function getExpenseToRevenueRatio(data, month, location, isManager = false) {
  const rev = getActualizedRevenue(data, month, location);
  if (rev === 0) return null;
  return (getTotalExpenses(data, month, location, isManager) / rev) * 100;
}

// ─── Section 3: Marketing ───

export function getAdSpend(data, month, location) {
  if (!data?.AD_STATISTICS) return 0;
  let rows = data.AD_STATISTICS;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => r.month === month);
  return rows.reduce((sum, r) => sum + r.adSpend, 0);
}

export function getROAS(data, month, location) {
  const spend = getAdSpend(data, month, location);
  if (spend === 0) return null;
  return getRevenueSales(data, month, location) / spend;
}

export function getCPA(data, month, location) {
  const count = getSalesCount(data, month, location);
  if (count === 0) return null;
  return getAdSpend(data, month, location) / count;
}

// ─── Section 4: Revenue by Program ───

export function getRevenueByProgram(data, month, location) {
  if (!data?.STUDENTS_MASTER) return [];
  let rows = data.STUDENTS_MASTER;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => extractYearMonth(r.depositDate) === month);

  const programMap = {};
  rows.forEach((r) => {
    const prog = r.program || 'Unknown';
    // Use AK (Recognized Revenue) instead of M — drops cancelled-student inflation
    programMap[prog] = (programMap[prog] || 0) + (r.recognizedRevenue || 0);
  });

  return Object.entries(programMap).map(([name, value]) => ({ name, value }));
}

// ─── Section 5: Cash & Collections ───

export function getCashCollected(data, month, location) {
  if (!data?.PAYMENTS_LOG) return 0;
  let rows = data.PAYMENTS_LOG;
  rows = filterByLocation(rows, location);
  rows = rows.filter((r) => r.paymentStatus === 'Paid' && r.paymentMonth === month);
  return rows.reduce((sum, r) => sum + r.paymentAmount, 0);
}

export function getCollectionRate(data, month, location) {
  const rev = getRevenueSales(data, month, location);
  if (rev === 0) return null;
  return (getCashCollected(data, month, location) / rev) * 100;
}

export function getOutstandingReceivables(data, location) {
  // Sum AL (AdjustedBalanceOwed) — already cancellation-aware (0 when Cancelled, M−W otherwise).
  // More accurate than (total revenue − total collected) because it ignores cancelled students.
  if (!data?.STUDENTS_MASTER) return 0;
  const students = filterByLocation(data.STUDENTS_MASTER, location);
  return students.reduce((sum, r) => sum + (r.adjustedBalanceOwed || 0), 0);
}

export function getCashInOffice(data, month) {
  if (!data?.CASH_LEDGER) return null;
  const rows = data.CASH_LEDGER.filter((r) => r.month === month);
  if (rows.length === 0) return null;

  const result = { ny: null, miami: null };
  rows.forEach((r) => {
    const loc = r.location === 'New York' ? 'ny' : r.location === 'Miami' ? 'miami' : null;
    if (loc) {
      result[loc] = {
        undepositedCash: r.netCash,
        countedCash: r.countedCash,
        discrepancy: r.discrepancy,
      };
    }
  });

  if (!result.ny && !result.miami) return null;

  result.total = {
    undepositedCash: (result.ny?.undepositedCash || 0) + (result.miami?.undepositedCash || 0),
    countedCash: (result.ny?.countedCash || 0) + (result.miami?.countedCash || 0),
    discrepancy: (result.ny?.discrepancy || 0) + (result.miami?.discrepancy || 0),
  };

  return result;
}

// ─── Section 6: Top Sales Reps ───

export function getTopSalesReps(data, month, location, limit = 5) {
  if (!data?.STUDENTS_MASTER || !data?.PAYMENTS_LOG) return [];

  let students = data.STUDENTS_MASTER.filter((r) => extractYearMonth(r.depositDate) === month);
  students = filterByLocation(students, location);

  // Count and sum by rep
  const repMap = {};
  students.forEach((r) => {
    const rep = r.salesRep1;
    if (!rep) return;
    if (!repMap[rep]) repMap[rep] = { name: rep, salesCount: 0, revenueSold: 0 };
    repMap[rep].salesCount++;
    // Revenue credited to rep = AK (Recognized Revenue), not gross contract value
    repMap[rep].revenueSold += (r.recognizedRevenue || 0);
  });

  // Get commissions from PAYMENTS_LOG
  let payments = data.PAYMENTS_LOG.filter((r) => r.paymentMonth === month && r.paymentStatus === 'Paid');
  payments = filterByLocation(payments, location);

  payments.forEach((p) => {
    if (p.rep1 && repMap[p.rep1]) {
      repMap[p.rep1].commission = (repMap[p.rep1].commission || 0) + p.rep1Commission;
    }
    if (p.rep2 && repMap[p.rep2]) {
      repMap[p.rep2].commission = (repMap[p.rep2].commission || 0) + p.rep2Commission;
    }
  });

  return Object.values(repMap)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit)
    .map((r) => ({ ...r, commission: r.commission || 0 }));
}

export function getTotalCommissionOwed(data, month, location) {
  if (!data?.PAYMENTS_LOG) return 0;
  let rows = data.PAYMENTS_LOG.filter((r) => r.paymentMonth === month && r.paymentStatus === 'Paid');
  rows = filterByLocation(rows, location);
  return rows.reduce((sum, r) => sum + r.rep1Commission + r.rep2Commission, 0);
}

// ─── Section 7: Sales Operations ───

// The three sales channels logged in DAILY_SALES_LOG (col D / Appt Type).
export const SALES_CHANNELS = ['In-Person', 'Phone Calls', 'Zoom'];

/**
 * Get DAILY_SALES_LOG rows for a month + location.
 * Resolves the legacy/channel mix: if ANY channel rows (non-blank Appt Type)
 * exist for the month, only those are returned — otherwise the legacy
 * summarized rows (blank Appt Type) are returned. This prevents the
 * transition month from double-counting while keeping old months visible.
 */
function getDailySalesRows(data, month, location) {
  if (!data?.DAILY_SALES_LOG || data.DAILY_SALES_LOG.length === 0) return [];
  let rows = filterByLocation(data.DAILY_SALES_LOG, location);
  rows = rows.filter((r) => r.month === month);
  if (rows.length === 0) return [];

  const channelRows = rows.filter((r) => r.apptType && r.apptType.trim() !== '');
  return channelRows.length > 0 ? channelRows : rows;
}

export function getSalesOperations(data, month, location) {
  const rows = getDailySalesRows(data, month, location);
  if (rows.length === 0) return null;

  // Aggregate from summed counts — never average per-row rate columns
  const appts = rows.reduce((s, r) => s + r.apptsScheduled, 0);
  const showUps = rows.reduce((s, r) => s + r.showUps, 0);
  const noShows = rows.reduce((s, r) => s + r.noShows, 0);
  const enrollments = rows.reduce((s, r) => s + r.enrollments, 0);

  return {
    appointmentsScheduled: appts,
    showUpRate: appts > 0 ? (showUps / appts) * 100 : null,
    closeRate: showUps > 0 ? (enrollments / showUps) * 100 : null,
    noShowRate: appts > 0 ? (noShows / appts) * 100 : null,
  };
}

/**
 * Break the sales funnel out by channel (In-Person / Phone Calls / Zoom)
 * for a month + location. Ignores legacy blank-Appt-Type rows so they
 * don't double-count. Rates are computed from summed counts.
 * Returns { channels: [...], total: {...} } or null if no channel data.
 */
export function getSalesByChannel(data, month, location) {
  if (!data?.DAILY_SALES_LOG || data.DAILY_SALES_LOG.length === 0) return null;
  let rows = filterByLocation(data.DAILY_SALES_LOG, location);
  rows = rows.filter((r) => r.month === month);
  // Rule: ignore rows with a blank Appt Type — those are legacy summarized rows.
  rows = rows.filter((r) => r.apptType && r.apptType.trim() !== '');
  if (rows.length === 0) return null;

  const buildRow = (name, subset) => {
    const scheduled = subset.reduce((s, r) => s + r.apptsScheduled, 0);
    const showUps = subset.reduce((s, r) => s + r.showUps, 0);
    const enrollments = subset.reduce((s, r) => s + r.enrollments, 0);
    return {
      channel: name,
      scheduled,
      showUps,
      enrollments,
      showUpRate: scheduled > 0 ? (showUps / scheduled) * 100 : null,
      closeRateVsShowed: showUps > 0 ? (enrollments / showUps) * 100 : null,
      closeRateVsScheduled: scheduled > 0 ? (enrollments / scheduled) * 100 : null,
    };
  };

  // One row per known channel; match case-insensitively on Appt Type
  const channels = SALES_CHANNELS.map((name) => {
    const subset = rows.filter(
      (r) => r.apptType.trim().toLowerCase() === name.toLowerCase()
    );
    return buildRow(name, subset);
  }).filter((c) => c.scheduled > 0 || c.showUps > 0 || c.enrollments > 0);

  // Catch any channel value not in the known list (defensive)
  const knownLower = SALES_CHANNELS.map((c) => c.toLowerCase());
  const otherRows = rows.filter((r) => !knownLower.includes(r.apptType.trim().toLowerCase()));
  if (otherRows.length > 0) {
    channels.push(buildRow('Other', otherRows));
  }

  if (channels.length === 0) return null;

  return { channels, total: buildRow('Total', rows) };
}

// ─── Section 8: Revenue Trend ───

export function getRevenueTrend(data, months, location) {
  return months.map((month) => ({
    month,
    revenueSales: getRevenueSales(data, month, location),
    actualizedRevenue: getActualizedRevenue(data, month, location),
    totalExpenses: getTotalExpenses(data, month, location),
  }));
}

// ─── Comparison helper ───

export function calcChange(current, previous) {
  if (previous === null || previous === undefined || previous === 0) return null;
  if (current === null || current === undefined) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
