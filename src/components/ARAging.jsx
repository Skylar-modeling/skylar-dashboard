import { formatCurrency, formatNumber } from '../utils/formatters';

// Color intensity scales with age — older bucket = stronger red
const BUCKET_STYLES = {
  current: 'border-[var(--color-accent-green)]/40 bg-[var(--color-accent-green)]/5',
  b1_30:   'border-[var(--color-accent-amber)]/40 bg-[var(--color-accent-amber)]/5',
  b31_60:  'border-[var(--color-accent-amber)]/60 bg-[var(--color-accent-amber)]/10',
  b61_90:  'border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/5',
  b90plus: 'border-[var(--color-accent-red)]/70 bg-[var(--color-accent-red)]/15',
};

const VALUE_COLOR = {
  current: 'text-[var(--color-accent-green)]',
  b1_30:   'text-[var(--color-accent-amber)]',
  b31_60:  'text-[var(--color-accent-amber)]',
  b61_90:  'text-[var(--color-accent-red)]',
  b90plus: 'text-[var(--color-accent-red)]',
};

/**
 * AR Aging strip — 5 buckets across the top.
 * When `onBucketClick` is provided each card becomes a button that filters
 * the Open Accounts list to that bucket. `selectedKey` highlights the active one.
 */
export default function ARAging({ buckets, onBucketClick, selectedKey }) {
  const total = buckets.reduce((sum, b) => sum + b.total, 0);
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  const interactive = typeof onBucketClick === 'function';

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b) => {
          const isSelected = selectedKey === b.key;
          const baseRing = BUCKET_STYLES[b.key] || '';
          const ringClass = isSelected
            ? 'ring-2 ring-[var(--color-accent-blue)] ring-offset-2 ring-offset-[var(--color-bg-primary)]'
            : '';
          const disabled = !interactive || b.count === 0;
          const Comp = interactive ? 'button' : 'div';
          return (
            <Comp
              key={b.key}
              type={interactive ? 'button' : undefined}
              onClick={interactive ? () => {
                if (b.count === 0) return;
                // Click-again to deselect
                if (isSelected) onBucketClick(null);
                else onBucketClick(b);
              } : undefined}
              disabled={interactive ? disabled : undefined}
              className={`rounded-xl border p-4 text-left transition-all ${baseRing} ${ringClass} ${
                interactive && !disabled ? 'cursor-pointer hover:scale-[1.02]' : ''
              } ${interactive && disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                {b.label}
              </div>
              <div className={`text-xl font-bold ${VALUE_COLOR[b.key] || 'text-[var(--color-text-primary)]'}`}>
                {formatCurrency(b.total)}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                {formatNumber(b.count)} account{b.count !== 1 ? 's' : ''}
                {total > 0 && b.total > 0 && (
                  <> · {Math.round((b.total / total) * 100)}%</>
                )}
              </div>
            </Comp>
          );
        })}
      </div>
      {totalCount > 0 && (
        <div className="text-[11px] text-[var(--color-text-muted)] mt-2 text-right">
          {interactive
            ? 'Click a bucket to filter Open Accounts below. '
            : ''}
          Aging basis: days since last successful payment (deposit date if never paid).
          Total {formatNumber(totalCount)} open account{totalCount !== 1 ? 's' : ''} · {formatCurrency(total)}.
        </div>
      )}
    </>
  );
}
