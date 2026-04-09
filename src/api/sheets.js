import { SHEET_ID, API_KEY, TAB_RANGES } from '../config/constants';

const GOOGLE_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const PROXY_URL = '/api/sheets';

function parseRows(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? '';
    });
    return obj;
  });
}

function parseNumeric(val) {
  if (val === '' || val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Look up a value from a raw row object using the first matching header name.
 * Handles sheets where headers may include extra text like "(YYYY-MM)" or newlines.
 */
function col(r, ...candidates) {
  // Try exact match first
  for (const c of candidates) {
    if (c in r) return r[c];
  }
  // Try partial match — header contains the candidate string
  const keys = Object.keys(r);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const found = keys.find((k) => k.toLowerCase().includes(lower));
    if (found !== undefined) return r[found];
  }
  return '';
}

/**
 * Normalize month values that come as "January 2026" or "2026-01" etc. to "YYYY-MM".
 */
function normalizeMonth(val) {
  if (!val) return '';
  const s = String(val).trim();
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // Try parsing "January 2026", "Jan 2026", etc.
  const d = new Date(s + ' 1'); // Append day so Date can parse "January 2026"
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    if (y > 2000) return `${y}-${m}`;
  }
  // Last resort — try Date directly
  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) {
    const y = d2.getFullYear();
    const m = String(d2.getMonth() + 1).padStart(2, '0');
    if (y > 2000) return `${y}-${m}`;
  }
  return s;
}

/**
 * Normalize location values — "Company-Wide" and blank both mean company-wide.
 */
function normalizeLocation(val) {
  const s = String(val || '').trim();
  if (s.toLowerCase() === 'company-wide' || s === '') return '';
  return s;
}

function normalizeTabData(key, rows) {
  const colMap = {
    STUDENTS_MASTER: (r) => ({
      studentId: col(r, 'Student ID'),
      fullName: col(r, 'Full Name'),
      email: col(r, 'Email'),
      phone: col(r, 'Phone'),
      location: col(r, 'Location'),
      program: col(r, 'Program'),
      startDate: col(r, 'Start Date'),
      endDate: col(r, 'End Date'),
      salesRep1: col(r, 'Sales Rep (Primary)'),
      salesRep2: col(r, 'Sales Rep (Secondary)'),
      splitDeal: col(r, 'Split Deal?'),
      contractPrice: parseNumeric(col(r, 'Contract Price')),
      deposit: parseNumeric(col(r, 'Deposit')),
      depositDate: col(r, 'Deposit Date'),
      depositMethod: col(r, 'Deposit Method'),
      contractSigned: col(r, 'Contract Signed?'),
      stripeCustomerId: col(r, 'Stripe Customer ID'),
      stripeSubId: col(r, 'Stripe Sub ID'),
      stripeStatus: col(r, 'Stripe Status'),
    }),
    ACTUALIZED_REVENUE: (r) => ({
      month: normalizeMonth(col(r, 'Month')),
      location: col(r, 'Location'),
      actualizedRevenue: parseNumeric(col(r, 'Actualized Revenue')),
      program: col(r, 'Program'),
      studentCount: parseNumeric(col(r, 'Student Count')),
      studentEmail: col(r, 'Student Email'),
    }),
    PAYMENTS_LOG: (r) => ({
      paymentId: col(r, 'Payment ID'),
      studentId: col(r, 'Student ID'),
      studentEmail: col(r, 'Student Email'),
      paymentAmount: parseNumeric(col(r, 'Payment Amount')),
      paymentDate: col(r, 'Payment Date'),
      paymentStatus: col(r, 'Payment Status'),
      source: col(r, 'Source'),
      location: col(r, 'Location'),
      stripeInvoiceId: col(r, 'Stripe Invoice ID'),
      stripeCustomerId: col(r, 'Stripe Customer ID'),
      rep1: col(r, 'Rep 1'),
      rep1Split: parseNumeric(col(r, 'Rep 1 Split')),
      rep1Commission: parseNumeric(col(r, 'Rep 1 Commission')),
      rep2: col(r, 'Rep 2'),
      rep2Split: parseNumeric(col(r, 'Rep 2 Split')),
      rep2Commission: parseNumeric(col(r, 'Rep 2 Commission')),
      paymentMonth: normalizeMonth(col(r, 'Payment Month')),
      refunded: col(r, 'Refunded'),
    }),
    SALES_REPS: (r) => ({
      name: col(r, 'Sales Rep'),
      commissionRate: parseNumeric(col(r, 'Commission Rate')),
      primaryLocation: col(r, 'Primary Location'),
      email: col(r, 'Email'),
      phone: col(r, 'Phone'),
      active: col(r, 'Active?'),
      notes: col(r, 'Notes', 'Title'),
    }),
    DAILY_SALES_LOG: (r) => ({
      timestamp: col(r, 'Timestamp'),
      salesRep: col(r, 'Sales Rep'),
      location: col(r, 'Location'),
      apptType: col(r, 'Appt Type'),
      shiftDate: col(r, 'Shift Date'),
      apptsScheduled: parseNumeric(col(r, 'Appts Scheduled')),
      showUps: parseNumeric(col(r, 'Show-Ups', 'Show Ups')),
      noShows: parseNumeric(col(r, 'No-Shows', 'No Shows')),
      enrollments: parseNumeric(col(r, 'Enrollments')),
      cancellations: parseNumeric(col(r, 'Cancellations')),
      depositCollected: parseNumeric(col(r, 'Deposit Collected')),
      notes: col(r, 'Notes'),
      month: normalizeMonth(col(r, 'Shift Date')),
    }),
    COMMISSION_MONTHLY: (r) => ({
      salesRep: col(r, 'Sales Rep'),
      month: normalizeMonth(col(r, 'Month')),
      location: col(r, 'Location'),
      revenueAsRep1: parseNumeric(col(r, 'Revenue as Rep 1')),
      commissionAsRep1: parseNumeric(col(r, 'Commission as Rep 1')),
      revenueAsRep2: parseNumeric(col(r, 'Revenue as Rep 2')),
      commissionAsRep2: parseNumeric(col(r, 'Commission as Rep 2')),
      totalCommission: parseNumeric(col(r, 'Total Commission')),
      commissionPaid: col(r, 'Commission Paid?'),
    }),
    REVENUE_BY_LOCATION: (r) => ({
      month: normalizeMonth(col(r, 'Month')),
      location: col(r, 'Location'),
      grossRevenue: parseNumeric(col(r, 'Gross Revenue')),
      refunds: parseNumeric(col(r, 'Refunds')),
      netRevenue: parseNumeric(col(r, 'Net Revenue')),
      numPayments: parseNumeric(col(r, '# Payments')),
      totalExpenses: parseNumeric(col(r, 'Total Expenses')),
      expenseCategories: col(r, 'Expense Categories'),
      numExpenses: parseNumeric(col(r, '# Expenses')),
      fbAds: parseNumeric(col(r, 'FB Ads')),
      googleAds: parseNumeric(col(r, 'Google Ads')),
      grossProfit: parseNumeric(col(r, 'Gross Profit')),
    }),
    MONTHLY_EXPENSES: (r) => ({
      month: normalizeMonth(col(r, 'Month')),
      location: normalizeLocation(col(r, 'Location')),
      amount: parseNumeric(col(r, 'Amount')),
      category: col(r, 'Category'),
      vendor: col(r, 'Vendor', 'Description'),
      paid: col(r, 'Paid?'),
      submittedBy: col(r, 'Submitted By'),
    }),
    AD_STATISTICS: (r) => ({
      location: col(r, 'Location'),
      month: normalizeMonth(col(r, 'Month')),
      platform: col(r, 'Platform'),
      adSpend: parseNumeric(col(r, 'Ad Spend')),
      impressions: parseNumeric(col(r, 'Impressions')),
      clicks: parseNumeric(col(r, 'Clicks')),
      leads: parseNumeric(col(r, 'Leads')),
      cpm: parseNumeric(col(r, 'CPM')),
      ctr: parseNumeric(col(r, 'CTR')),
      cpc: parseNumeric(col(r, 'CPC')),
      cpl: parseNumeric(col(r, 'CPL')),
      lpc: parseNumeric(col(r, 'LPC')),
    }),
    CASH_TRANSACTIONS: (r) => ({
      transactionId: col(r, 'Transaction ID'),
      date: col(r, 'Date'),
      location: col(r, 'Location'),
      type: col(r, 'Type'),
      amount: parseNumeric(col(r, 'Amount')),
      studentName: col(r, 'Student Name'),
      studentEmail: col(r, 'Student Email'),
      paymentMethod: col(r, 'Payment Method'),
      depositedToBank: col(r, 'Deposited to Bank?'),
      depositDate: col(r, 'Deposit Date'),
      recordedBy: col(r, 'Recorded By'),
    }),
    CASH_LEDGER: (r) => ({
      month: normalizeMonth(col(r, 'Month')),
      location: col(r, 'Location'),
      cashIn: parseNumeric(col(r, 'Cash In')),
      cashOut: parseNumeric(col(r, 'Cash Out')),
      netCash: parseNumeric(col(r, 'Net Cash')),
      cumulativeCashIn: parseNumeric(col(r, 'Cumulative Cash In')),
      cumulativeCashOut: parseNumeric(col(r, 'Cumulative Cash Out', 'Cumulative Net')),
      countedCash: parseNumeric(col(r, 'Counted Cash')),
      discrepancy: parseNumeric(col(r, 'Discrepancy')),
    }),
  };

  const mapper = colMap[key];
  if (!mapper) return rows;
  return rows.map(mapper);
}

let cachedData = null;
let lastFetchTime = null;

function processSheetResponse(json) {
  const tabKeys = Object.keys(TAB_RANGES);
  const data = {};
  json.valueRanges.forEach((vr, i) => {
    const key = tabKeys[i];
    const rows = parseRows(vr.values);
    data[key] = normalizeTabData(key, rows);
  });
  cachedData = data;
  lastFetchTime = new Date();
  return data;
}

export async function fetchAllSheetData() {
  // Try server-side proxy first (API key hidden), fall back to direct API
  const ranges = Object.values(TAB_RANGES).map((r) => `ranges=${encodeURIComponent(r)}`).join('&');

  try {
    // Check if proxy is available (Vercel deployment)
    const probeUrl = `${PROXY_URL}?${ranges}`;
    const probeResp = await fetch(probeUrl, { method: 'GET' });
    const contentType = probeResp.headers.get('content-type') || '';
    if (probeResp.ok && contentType.includes('application/json')) {
      // Proxy returned valid JSON — use the already-fetched response
      const json = await probeResp.json();
      if (json.valueRanges) {
        return processSheetResponse(json);
      }
    }
  } catch {
    // Proxy not available (local dev), use direct API
  }

  // Proxy didn't work — use direct API
  if (!API_KEY) {
    console.warn('No Google API Key configured. Set VITE_GOOGLE_API_KEY in your .env file.');
    return null;
  }
  const directUrl = `${GOOGLE_BASE_URL}/${SHEET_ID}/values:batchGet?${ranges}&key=${API_KEY}`;
  const response = await fetch(directUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch data. Please try again.');
  }
  const json = await response.json();
  return processSheetResponse(json);
}

export function getCachedData() {
  return { data: cachedData, lastFetchTime };
}
