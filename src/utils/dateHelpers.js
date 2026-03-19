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
  // Handle YYYY-MM already
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
  // Handle various date formats
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
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

export function getAvailableMonths(data) {
  const months = new Set();
  if (data?.STUDENTS_MASTER) {
    data.STUDENTS_MASTER.forEach((s) => {
      const m = extractYearMonth(s.depositDate);
      if (m) months.add(m);
    });
  }
  if (data?.ACTUALIZED_REVENUE) {
    data.ACTUALIZED_REVENUE.forEach((r) => {
      if (r.month) months.add(r.month);
    });
  }
  if (data?.PAYMENTS_LOG) {
    data.PAYMENTS_LOG.forEach((p) => {
      if (p.paymentMonth) months.add(p.paymentMonth);
    });
  }
  return Array.from(months).sort().reverse();
}
