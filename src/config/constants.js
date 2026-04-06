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

// Authentication & Role System
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const ROLES = {
  CEO: 'ceo',
  MANAGER_NYC: 'manager_nyc',
  MANAGER_MIA: 'manager_mia',
  ADVISOR_NYC: 'advisor_nyc',
  ADVISOR_MIA: 'advisor_mia',
  REP_NYC: 'rep_nyc',
  REP_MIA: 'rep_mia',
};

export const ROLE_LABELS = {
  [ROLES.CEO]: 'CEO',
  [ROLES.MANAGER_NYC]: 'Manager NYC',
  [ROLES.MANAGER_MIA]: 'Manager MIA',
  [ROLES.ADVISOR_NYC]: 'Advisor NYC',
  [ROLES.ADVISOR_MIA]: 'Advisor MIA',
  [ROLES.REP_NYC]: 'Rep NYC',
  [ROLES.REP_MIA]: 'Rep MIA',
};

// Maps each role to the route paths it can access
const SINGLE_ROLE_ACCESS = {
  [ROLES.CEO]: ['/ceo', '/manager/new-york', '/manager/miami', '/advisor/new-york', '/advisor/miami', '/rep/new-york', '/rep/miami', '/admin'],
  [ROLES.MANAGER_NYC]: ['/manager/new-york', '/advisor/new-york', '/rep/new-york'],
  [ROLES.MANAGER_MIA]: ['/manager/miami', '/advisor/miami', '/rep/miami'],
  [ROLES.ADVISOR_NYC]: ['/advisor/new-york'],
  [ROLES.ADVISOR_MIA]: ['/advisor/miami'],
  [ROLES.REP_NYC]: ['/rep/new-york'],
  [ROLES.REP_MIA]: ['/rep/miami'],
};

// Get all allowed paths for a user (supports multiple roles as array or single string)
export function getAllowedPaths(roles) {
  if (!roles) return [];
  const roleList = Array.isArray(roles) ? roles : [roles];
  const paths = new Set();
  roleList.forEach((role) => {
    (SINGLE_ROLE_ACCESS[role] || []).forEach((p) => paths.add(p));
  });
  return Array.from(paths);
}

export function canAccessRoute(roles, path) {
  return getAllowedPaths(roles).includes(path);
}
