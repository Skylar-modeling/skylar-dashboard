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

function normalizeTabData(key, rows) {
  const colMap = {
    STUDENTS_MASTER: (r) => ({
      studentId: r['Student ID'] ?? r[Object.keys(r)[0]] ?? '',
      fullName: r['Full Name'] ?? r[Object.keys(r)[1]] ?? '',
      email: r['Email'] ?? r[Object.keys(r)[2]] ?? '',
      phone: r['Phone'] ?? r[Object.keys(r)[3]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[5]] ?? '',
      program: r['Program'] ?? r[Object.keys(r)[6]] ?? '',
      startDate: r['Start Date'] ?? r[Object.keys(r)[7]] ?? '',
      endDate: r['End Date'] ?? r[Object.keys(r)[8]] ?? '',
      salesRep1: r['Sales Rep (Primary)'] ?? r[Object.keys(r)[9]] ?? '',
      salesRep2: r['Sales Rep (Secondary)'] ?? r[Object.keys(r)[10]] ?? '',
      splitDeal: r['Split Deal?'] ?? r[Object.keys(r)[11]] ?? '',
      contractPrice: parseNumeric(r['Contract Price'] ?? r[Object.keys(r)[12]]),
      deposit: parseNumeric(r['Deposit'] ?? r[Object.keys(r)[13]]),
      depositDate: r['Deposit Date'] ?? r[Object.keys(r)[14]] ?? '',
      depositMethod: r['Deposit Method'] ?? r[Object.keys(r)[15]] ?? '',
      contractSigned: r['Contract Signed?'] ?? r[Object.keys(r)[16]] ?? '',
      stripeCustomerId: r['Stripe Customer ID'] ?? r[Object.keys(r)[17]] ?? '',
      stripeSubId: r['Stripe Sub ID'] ?? r[Object.keys(r)[18]] ?? '',
      stripeStatus: r['Stripe Status'] ?? r[Object.keys(r)[19]] ?? '',
    }),
    ACTUALIZED_REVENUE: (r) => ({
      month: r['Month'] ?? r[Object.keys(r)[0]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[1]] ?? '',
      actualizedRevenue: parseNumeric(r['Actualized Revenue ($)'] ?? r[Object.keys(r)[2]]),
      program: r['Program'] ?? r[Object.keys(r)[3]] ?? '',
      studentCount: parseNumeric(r['Student Count'] ?? r[Object.keys(r)[4]]),
      studentEmail: r['Student Email'] ?? r[Object.keys(r)[5]] ?? '',
    }),
    PAYMENTS_LOG: (r) => ({
      paymentId: r['Payment ID'] ?? r[Object.keys(r)[0]] ?? '',
      studentId: r['Student ID'] ?? r[Object.keys(r)[1]] ?? '',
      studentEmail: r['Student Email'] ?? r[Object.keys(r)[2]] ?? '',
      paymentAmount: parseNumeric(r['Payment Amount'] ?? r[Object.keys(r)[3]]),
      paymentDate: r['Payment Date'] ?? r[Object.keys(r)[4]] ?? '',
      paymentStatus: r['Payment Status'] ?? r[Object.keys(r)[5]] ?? '',
      source: r['Source'] ?? r[Object.keys(r)[6]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[7]] ?? '',
      stripeInvoiceId: r['Stripe Invoice ID'] ?? r[Object.keys(r)[8]] ?? '',
      stripeCustomerId: r['Stripe Customer ID'] ?? r[Object.keys(r)[9]] ?? '',
      rep1: r['Rep 1'] ?? r[Object.keys(r)[10]] ?? '',
      rep1Split: parseNumeric(r['Rep 1 Split %'] ?? r[Object.keys(r)[11]]),
      rep1Commission: parseNumeric(r['Rep 1 Commission ($)'] ?? r[Object.keys(r)[12]]),
      rep2: r['Rep 2'] ?? r[Object.keys(r)[13]] ?? '',
      rep2Split: parseNumeric(r['Rep 2 Split %'] ?? r[Object.keys(r)[14]]),
      rep2Commission: parseNumeric(r['Rep 2 Commission ($)'] ?? r[Object.keys(r)[15]]),
      paymentMonth: r['Payment Month'] ?? r[Object.keys(r)[16]] ?? '',
      refunded: r['Refunded'] ?? r[Object.keys(r)[17]] ?? '',
    }),
    SALES_REPS: (r) => ({
      name: r['Sales Rep'] ?? r[Object.keys(r)[0]] ?? '',
      commissionRate: parseNumeric(r['Commission Rate'] ?? r[Object.keys(r)[1]]),
      primaryLocation: r['Primary Location'] ?? r[Object.keys(r)[2]] ?? '',
      email: r['Email'] ?? r[Object.keys(r)[3]] ?? '',
      phone: r['Phone'] ?? r[Object.keys(r)[4]] ?? '',
      active: r['Active?'] ?? r[Object.keys(r)[5]] ?? '',
      notes: r['Notes'] ?? r[Object.keys(r)[6]] ?? '',
    }),
    DAILY_SALES_LOG: (r) => ({
      timestamp: r['Timestamp'] ?? r[Object.keys(r)[0]] ?? '',
      salesRep: r['Sales Rep'] ?? r[Object.keys(r)[1]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[2]] ?? '',
      apptType: r['Appt Type'] ?? r[Object.keys(r)[3]] ?? '',
      shiftDate: r['Shift Date'] ?? r[Object.keys(r)[4]] ?? '',
      apptsScheduled: parseNumeric(r['Appts Scheduled'] ?? r[Object.keys(r)[6]]),
      showUps: parseNumeric(r['Show-Ups'] ?? r[Object.keys(r)[7]]),
      noShows: parseNumeric(r['No-Shows'] ?? r[Object.keys(r)[8]]),
      enrollments: parseNumeric(r['Enrollments'] ?? r[Object.keys(r)[9]]),
      cancellations: parseNumeric(r['Cancellations'] ?? r[Object.keys(r)[10]]),
      depositCollected: parseNumeric(r['Deposit Collected ($)'] ?? r[Object.keys(r)[11]]),
      notes: r['Notes'] ?? r[Object.keys(r)[12]] ?? '',
      month: r['Month'] ?? r[Object.keys(r)[13]] ?? '',
    }),
    COMMISSION_MONTHLY: (r) => ({
      salesRep: r['Sales Rep'] ?? r[Object.keys(r)[0]] ?? '',
      month: r['Month'] ?? r[Object.keys(r)[1]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[2]] ?? '',
      revenueAsRep1: parseNumeric(r['Revenue as Rep 1 ($)'] ?? r[Object.keys(r)[3]]),
      commissionAsRep1: parseNumeric(r['Commission as Rep 1 ($)'] ?? r[Object.keys(r)[4]]),
      revenueAsRep2: parseNumeric(r['Revenue as Rep 2 ($)'] ?? r[Object.keys(r)[5]]),
      commissionAsRep2: parseNumeric(r['Commission as Rep 2 ($)'] ?? r[Object.keys(r)[6]]),
      totalCommission: parseNumeric(r['Total Commission ($)'] ?? r[Object.keys(r)[7]]),
      commissionPaid: r['Commission Paid?'] ?? r[Object.keys(r)[8]] ?? '',
    }),
    REVENUE_BY_LOCATION: (r) => ({
      month: r['Month'] ?? r[Object.keys(r)[0]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[1]] ?? '',
      grossRevenue: parseNumeric(r['Gross Revenue ($)'] ?? r[Object.keys(r)[2]]),
      refunds: parseNumeric(r['Refunds ($)'] ?? r[Object.keys(r)[3]]),
      netRevenue: parseNumeric(r['Net Revenue ($)'] ?? r[Object.keys(r)[4]]),
      numPayments: parseNumeric(r['# Payments'] ?? r[Object.keys(r)[5]]),
      totalExpenses: parseNumeric(r['Total Expenses ($)'] ?? r[Object.keys(r)[6]]),
      expenseCategories: r['Expense Categories'] ?? r[Object.keys(r)[7]] ?? '',
      numExpenses: parseNumeric(r['# Expenses'] ?? r[Object.keys(r)[8]]),
      fbAds: parseNumeric(r['FB Ads ($)'] ?? r[Object.keys(r)[9]]),
      googleAds: parseNumeric(r['Google Ads ($)'] ?? r[Object.keys(r)[10]]),
      grossProfit: parseNumeric(r['Gross Profit ($)'] ?? r[Object.keys(r)[11]]),
    }),
    MONTHLY_EXPENSES: (r) => ({
      month: r['Month'] ?? r[Object.keys(r)[0]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[1]] ?? '',
      amount: parseNumeric(r['Amount'] ?? r[Object.keys(r)[2]]),
      category: r['Category'] ?? r[Object.keys(r)[3]] ?? '',
      vendor: r['Vendor / Description'] ?? r[Object.keys(r)[4]] ?? '',
      paid: r['Paid?'] ?? r[Object.keys(r)[5]] ?? '',
      submittedBy: r['Submitted By'] ?? r[Object.keys(r)[6]] ?? '',
    }),
    AD_STATISTICS: (r) => ({
      location: r['Location'] ?? r[Object.keys(r)[0]] ?? '',
      month: r['Month'] ?? r[Object.keys(r)[1]] ?? '',
      platform: r['Platform'] ?? r[Object.keys(r)[2]] ?? '',
      adSpend: parseNumeric(r['Ad Spend ($)'] ?? r[Object.keys(r)[3]]),
      impressions: parseNumeric(r['Impressions'] ?? r[Object.keys(r)[4]]),
      clicks: parseNumeric(r['Clicks'] ?? r[Object.keys(r)[5]]),
      leads: parseNumeric(r['Leads'] ?? r[Object.keys(r)[6]]),
      cpm: parseNumeric(r['CPM ($)'] ?? r[Object.keys(r)[7]]),
      ctr: parseNumeric(r['CTR (%)'] ?? r[Object.keys(r)[8]]),
      cpc: parseNumeric(r['CPC ($)'] ?? r[Object.keys(r)[9]]),
      cpl: parseNumeric(r['CPL ($)'] ?? r[Object.keys(r)[10]]),
      lpc: parseNumeric(r['LPC (%)'] ?? r[Object.keys(r)[11]]),
    }),
    CASH_TRANSACTIONS: (r) => ({
      transactionId: r['Transaction ID'] ?? r[Object.keys(r)[0]] ?? '',
      date: r['Date'] ?? r[Object.keys(r)[1]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[2]] ?? '',
      type: r['Type'] ?? r[Object.keys(r)[3]] ?? '',
      amount: parseNumeric(r['Amount'] ?? r[Object.keys(r)[4]]),
      studentName: r['Student Name'] ?? r[Object.keys(r)[5]] ?? '',
      studentEmail: r['Student Email'] ?? r[Object.keys(r)[6]] ?? '',
      paymentMethod: r['Payment Method'] ?? r[Object.keys(r)[7]] ?? '',
      depositedToBank: r['Deposited to Bank?'] ?? r[Object.keys(r)[8]] ?? '',
      depositDate: r['Deposit Date'] ?? r[Object.keys(r)[9]] ?? '',
      recordedBy: r['Recorded By'] ?? r[Object.keys(r)[10]] ?? '',
    }),
    CASH_LEDGER: (r) => ({
      month: r['Month'] ?? r[Object.keys(r)[0]] ?? '',
      location: r['Location'] ?? r[Object.keys(r)[1]] ?? '',
      cashIn: parseNumeric(r['Cash In ($)'] ?? r[Object.keys(r)[2]]),
      cashOut: parseNumeric(r['Cash Out ($)'] ?? r[Object.keys(r)[3]]),
      netCash: parseNumeric(r['Net Cash This Month ($)'] ?? r[Object.keys(r)[4]]),
      cumulativeCashIn: parseNumeric(r['Cumulative Cash In ($)'] ?? r[Object.keys(r)[5]]),
      cumulativeCashOut: parseNumeric(r['Cumulative Cash Out ($)'] ?? r[Object.keys(r)[6]]),
      countedCash: parseNumeric(r['Counted Cash ($)'] ?? r[Object.keys(r)[7]]),
      discrepancy: parseNumeric(r['Discrepancy ($)'] ?? r[Object.keys(r)[8]]),
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
