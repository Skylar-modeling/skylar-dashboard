import ComparisonBadge from './ComparisonBadge';

export default function MetricCard({ label, value, comparison, comparisonLabel, format = 'text' }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-2">
      <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-bold text-[var(--color-text-primary)]">
        {value}
      </span>
      <div>
        <ComparisonBadge value={comparison} label={comparisonLabel} />
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-32" />
      <div className="skeleton h-4 w-16" />
    </div>
  );
}
