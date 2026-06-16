import { useState, useMemo } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency } from '../utils/formatters';
import { PROGRAMS } from '../config/constants';

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

function StatusBadge({ status }) {
  const s = (status || '').trim().toLowerCase();
  if (!s) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-border)] text-[var(--color-text-muted)]">
        —
      </span>
    );
  }
  const color = s === 'cancelled'
    ? 'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]'
    : s === 'active'
      ? 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]'
      : 'bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)]';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {status}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return d;
  }
}

/**
 * Open Accounts list — every student with Outstanding > $0, sorted by Start Date
 * ascending by default. Filter chips for Program. Click any row to open the
 * existing StudentDetail modal.
 *
 * Optional props:
 *   agingBucket   = bucket object from AR Aging (with `students` array) when the
 *                   parent dashboard wants this list scoped to one aging bucket
 *   onClearAging  = handler invoked when the user clicks "clear aging filter"
 */
export default function OpenAccountsList({ accounts, data, agingBucket, onClearAging }) {
  const [programFilter, setProgramFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // If an aging bucket is active, intersect by student identity
  const bucketScoped = useMemo(() => {
    if (!agingBucket) return accounts;
    const ids = new Set(
      (agingBucket.students || []).map((s) => (s.studentId || s.email || '').toLowerCase()).filter(Boolean)
    );
    if (ids.size === 0) return [];
    return accounts.filter((a) => ids.has((a.studentId || a.email || '').toLowerCase()));
  }, [accounts, agingBucket]);

  const filtered = useMemo(() => {
    if (programFilter === 'ALL') return bucketScoped;
    return bucketScoped.filter((a) => a.program === programFilter);
  }, [bucketScoped, programFilter]);

  const programCounts = useMemo(() => {
    const m = { ALL: bucketScoped.length };
    PROGRAMS.forEach((p) => { m[p] = 0; });
    bucketScoped.forEach((a) => {
      if (a.program in m) m[a.program] += 1;
    });
    return m;
  }, [bucketScoped]);

  const totalOutstanding = useMemo(
    () => filtered.reduce((sum, a) => sum + (a.outstanding || 0), 0),
    [filtered]
  );

  const handleSelect = (student) => {
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  if (!accounts || accounts.length === 0) {
    return (
      <EmptyState
        title="All clear ✓"
        message="No accounts with an outstanding balance."
      />
    );
  }

  return (
    <>
      {/* Aging-bucket filter banner */}
      {agingBucket && (
        <div className="mb-3 flex items-center justify-between gap-3 bg-[var(--color-accent-blue)]/10 border border-[var(--color-accent-blue)]/30 rounded-lg px-3 py-2">
          <div className="text-xs text-[var(--color-text-primary)]">
            Filtered to <span className="font-semibold">{agingBucket.label}</span> aging bucket
            {' · '}
            <span className="text-[var(--color-text-secondary)]">
              {bucketScoped.length} account{bucketScoped.length !== 1 ? 's' : ''}
            </span>
          </div>
          {onClearAging && (
            <button
              onClick={onClearAging}
              className="text-xs text-[var(--color-accent-blue)] hover:underline cursor-pointer"
            >
              Clear ×
            </button>
          )}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FilterChip active={programFilter === 'ALL'} onClick={() => setProgramFilter('ALL')} count={programCounts.ALL}>
          All
        </FilterChip>
        {PROGRAMS.map((p) => (
          <FilterChip
            key={p}
            active={programFilter === p}
            onClick={() => setProgramFilter(p)}
            count={programCounts[p] || 0}
          >
            {p}
          </FilterChip>
        ))}
        <div className="ml-auto text-xs text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text-secondary)]">{filtered.length}</span> account{filtered.length !== 1 ? 's' : ''} · <span className="text-[var(--color-accent-amber)] font-medium">{formatCurrency(totalOutstanding)}</span> outstanding
        </div>
      </div>

      {/* Scrollable table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Program</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Start Date</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Contract</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Paid</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Outstanding</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Failed</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Last Pmt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                    No accounts match this filter
                  </td>
                </tr>
              ) : filtered.map((a, i) => (
                <tr
                  key={a.studentId || a.email || i}
                  onClick={() => handleSelect(a)}
                  className="border-b border-[var(--color-border)]/40 hover:bg-[var(--color-bg-primary)]/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 text-[var(--color-text-primary)] font-medium">{a.fullName || '—'}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-secondary)]">{a.program || '—'}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-secondary)]">{fmtDate(a.startDate)}</td>
                  <td className="py-2.5 px-4 text-right text-[var(--color-text-primary)]">{formatCurrency(a.contractPrice)}</td>
                  <td className="py-2.5 px-4 text-right text-[var(--color-accent-green)]">{formatCurrency(a.paid)}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-[var(--color-accent-amber)]">{formatCurrency(a.outstanding)}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={a.enrollmentStatus} /></td>
                  <td className={`py-2.5 px-4 text-right font-medium ${a.failedCount > 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-muted)]'}`}>{a.failedCount}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-muted)]">{fmtDate(a.lastPaymentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}
