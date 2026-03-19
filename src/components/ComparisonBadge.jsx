import { formatPercent } from '../utils/formatters';

export default function ComparisonBadge({ value, label }) {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-primary)] px-2 py-0.5 rounded-full">
        {label || 'N/A'}
      </span>
    );
  }

  const isPositive = value >= 0;
  const color = isPositive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]';
  const bg = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
  const arrow = isPositive ? '\u2191' : '\u2193';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${bg} px-2 py-0.5 rounded-full`}>
      {arrow} {isPositive ? '+' : ''}{formatPercent(value)}
    </span>
  );
}
