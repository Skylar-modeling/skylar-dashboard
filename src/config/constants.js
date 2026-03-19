export const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID || '1qT6iDfbXXLtkS617cSfhdV09S3AneDgK4ry9BRfgQXA';
export const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export const LOCATIONS = {
  ALL: 'ALL',
  NEW_YORK: 'New York',
  MIAMI: 'Miami',
};

export const PROGRAMS = ['8 Weeks', 'Model Weekend', 'Photoshoot', 'Online Program'];

export const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const TAB_RANGES = {
  STUDENTS_MASTER: 'STUDENTS_MASTER!A:T',
  ACTUALIZED_REVENUE: 'ACTUALIZED_REVENUE!A:F',
  PAYMENTS_LOG: 'PAYMENTS_LOG!A:R',
  SALES_REPS: 'SALES_REPS!A:G',
  DAILY_SALES_LOG: 'DAILY_SALES_LOG!A:N',
  COMMISSION_MONTHLY: 'COMMISSION_MONTHLY!A:I',
  REVENUE_BY_LOCATION: 'REVENUE_BY_LOCATION!A:L',
  MONTHLY_EXPENSES: 'MONTHLY_EXPENSES!A:G',
  AD_STATISTICS: 'AD_STATISTICS!A:L',
  CASH_TRANSACTIONS: 'CASH_TRANSACTIONS!A:K',
  CASH_LEDGER: 'CASH_LEDGER!A:I',
};

export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#14B8A6',
  accent: '#F59E0B',
  green: '#22C55E',
  red: '#EF4444',
  purple: '#A855F7',
  muted: '#64748B',
};

export const PROGRAM_COLORS = {
  '8 Weeks': '#3B82F6',
  'Model Weekend': '#14B8A6',
  'Photoshoot': '#F59E0B',
  'Online Program': '#A855F7',
};
