export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatCompact(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}
