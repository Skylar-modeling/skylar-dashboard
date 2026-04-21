export function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getPreviousMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function getSameMonthLastYear(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${y - 1}-${String(m).padStart(2, '0')}`;
}

export function extractYearMonth(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // Handle YYYY-MM already
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // Handle YYYY-MM-DD directly by string slicing (avoids timezone bugs with new Date())
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
  // Handle MM/DD/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${slash[1].padStart(2, '0')}`;
  // Fallback — use Date but with UTC methods to avoid timezone shift
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthDisplay(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${y}`;
}

export function getLast6Months(yyyymm) {
  const months = [];
  let current = yyyymm;
  for (let i = 0; i < 6; i++) {
    months.unshift(current);
    current = getPreviousMonth(current);
  }
  return months;
}

export function getYTDMonths(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const months = [];
  for (let i = 1; i <= m; i++) {
    months.push(`${y}-${String(i).padStart(2, '0')}`);
  }
  return months;
}

function isValidMonth(m) {
  return m && /^\d{4}-\d{2}$/.test(m);
}

export function getAvailableMonths(data) {
  const months = new Set();
  if (data?.STUDENTS_MASTER) {
    data.STUDENTS_MASTER.forEach((s) => {
      const m = extractYearMonth(s.depositDate);
      if (isValidMonth(m)) months.add(m);
    });
  }
  if (data?.ACTUALIZED_REVENUE) {
    data.ACTUALIZED_REVENUE.forEach((r) => {
      if (isValidMonth(r.month)) months.add(r.month);
    });
  }
  if (data?.PAYMENTS_LOG) {
    data.PAYMENTS_LOG.forEach((p) => {
      if (isValidMonth(p.paymentMonth)) months.add(p.paymentMonth);
    });
  }
  return Array.from(months).sort().reverse();
}
