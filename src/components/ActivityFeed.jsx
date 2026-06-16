import { useState, useMemo } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency, formatNumber } from '../utils/formatters';

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

const TYPE_META = {
  enrollment:    { dot: 'bg-[var(--color-accent-green)]',  icon: '+' },
  paid:          { dot: 'bg-[var(--color-accent-green)]',  icon: '✓' },
  cancellation:  { dot: 'bg-[var(--color-accent-amber)]',  icon: '×' },
  refunded:      { dot: 'bg-[var(--color-accent-amber)]',  icon: '↩' },
  failed:        { dot: 'bg-[var(--color-accent-red)]',    icon: '!' },
  dispute:       { dot: 'bg-[var(--color-accent-red)]',    icon: '⚠' },
};

const FILTERS = [
  { key: 'ALL',          label: 'All' },
  { key: 'enrollment',   label: 'Enrollments' },
  { key: 'cancellation', label: 'Cancellations' },
  { key: 'failed',       label: 'Failed' },
  { key: 'dispute',      label: 'Disputes' },
  { key: 'refunded',     label: 'Refunds' },
  { key: 'paid',         label: 'Paid' },
];

function FilterChip({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors border ${
        active
          ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)] text-white'
          : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)]'
      }`}
    >
      {children}
      {count != null && <span className="ml-1.5 opacity-70">{count}</span>}
    </button>
  );
}

/**
 * Recent Activity feed — chronological 7-day event stream.
 * Scan for "what changed?" — catches forgotten cancellations,
 * enrollments without first charges, etc.
 */
export default function ActivityFeed({ events, data }) {
  const [filter, setFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const counts = useMemo(() => {
    const m = { ALL: events.length };
    FILTERS.forEach((f) => { if (f.key !== 'ALL') m[f.key] = 0; });
    events.forEach((e) => { if (e.type in m) m[e.type] += 1; });
    return m;
  }, [events]);

  const visible = useMemo(
    () => filter === 'ALL' ? events : events.filter((e) => e.type === filter),
    [events, filter]
  );

  const handleSelect = (student) => {
    if (!student) return;
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  if (!events || events.length === 0) {
    return (
      <EmptyState
        title="No activity in the last 7 days"
        message="Nothing has moved — no enrollments, cancellations, or payment events."
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
            count={counts[f.key] || 0}
          >
            {f.label}
          </FilterChip>
        ))}
        <div className="ml-auto text-[11px] text-[var(--color-text-muted)]">
          Showing {formatNumber(visible.length)} of {formatNumber(events.length)} · last 7 days
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
            No {filter} events in the last 7 days.
          </div>
        ) : visible.map((e, i) => {
          const meta = TYPE_META[e.type] || { dot: 'bg-[var(--color-text-muted)]', icon: '·' };
          return (
            <button
              key={`${e.type}-${e.studentEmail}-${e.date}-${i}`}
              onClick={() => handleSelect(e.student)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[var(--color-bg-primary)]/50 transition-colors ${i > 0 ? 'border-t border-[var(--color-border)]/40' : ''}`}
            >
              <span className={`w-6 h-6 rounded-full ${meta.dot} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                {meta.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--color-text-primary)] truncate">
                  <span className="font-medium">{e.label}</span>
                  <span className="text-[var(--color-text-muted)]"> · {e.studentName || '(unknown)'}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{e.studentEmail}</div>
              </div>
              <div className="text-right shrink-0">
                {e.amount > 0 && (
                  <div className={`text-sm font-medium ${
                    e.severity === 'red' ? 'text-[var(--color-accent-red)]'
                    : e.severity === 'amber' ? 'text-[var(--color-accent-amber)]'
                    : 'text-[var(--color-text-primary)]'
                  }`}>
                    {formatCurrency(e.amount)}
                  </div>
                )}
                <div className="text-[11px] text-[var(--color-text-muted)]">{fmtDate(e.date)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedStudent && (
        <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  );
}
