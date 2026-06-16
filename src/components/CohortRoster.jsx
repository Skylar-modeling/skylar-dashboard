import { useState, useMemo } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency } from '../utils/formatters';
import { PROGRAMS, LOCATIONS } from '../config/constants';

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

const statusMeta = {
  paid:      { color: 'bg-[var(--color-accent-green)]', label: 'Paid' },
  ontrack:   { color: 'bg-[var(--color-accent-amber)]', label: 'On plan' },
  attention: { color: 'bg-[var(--color-accent-red)]',   label: 'Needs attention' },
  cancelled: { color: 'bg-[var(--color-text-muted)]/40', label: 'Cancelled' },
};

function StatusDot({ status }) {
  const meta = statusMeta[status] || statusMeta.ontrack;
  return <span className={`inline-block w-2 h-2 rounded-full ${meta.color}`} title={meta.label} />;
}

function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

function fmtMonth(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${y}`;
}

function CohortHeader({ cohort, showLocation }) {
  const counts = cohort.students.reduce(
    (acc, s) => { acc[s.paymentStatus] = (acc[s.paymentStatus] || 0) + 1; return acc; },
    {}
  );
  const dateLabel = cohort.isOnline
    ? `${fmtMonth(cohort.saleMonth)} sales`
    : cohort.endDate
      ? `${fmtDate(cohort.startDate)} → ${fmtDate(cohort.endDate)}`
      : fmtDate(cohort.startDate);

  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{dateLabel}</div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
          {showLocation && <>{cohort.location} · </>}
          {cohort.students.length} student{cohort.students.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
        {counts.paid > 0 && (
          <span className="flex items-center gap-1"><StatusDot status="paid" />{counts.paid}</span>
        )}
        {counts.ontrack > 0 && (
          <span className="flex items-center gap-1"><StatusDot status="ontrack" />{counts.ontrack}</span>
        )}
        {counts.attention > 0 && (
          <span className="flex items-center gap-1"><StatusDot status="attention" />{counts.attention}</span>
        )}
        {counts.cancelled > 0 && (
          <span className="flex items-center gap-1"><StatusDot status="cancelled" />{counts.cancelled}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Per-cohort class roster. One card per cohort with a scannable roster.
 * Spot-check workflow: "is anyone in this class misplaced or forgotten?"
 */
export default function CohortRoster({ cohorts, data, location }) {
  const [program, setProgram] = useState('8 Weeks');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const showLocation = !location || location === LOCATIONS.ALL;

  const programCounts = useMemo(() => {
    const m = {};
    PROGRAMS.forEach((p) => { m[p] = 0; });
    cohorts.forEach((c) => { if (c.program in m) m[c.program] += 1; });
    return m;
  }, [cohorts]);

  const filtered = useMemo(
    () => cohorts.filter((c) => c.program === program),
    [cohorts, program]
  );

  const handleSelect = (student) => {
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PROGRAMS.map((p) => (
          <FilterChip
            key={p}
            active={program === p}
            onClick={() => setProgram(p)}
            count={programCounts[p]}
          >
            {p}
          </FilterChip>
        ))}
        <div className="ml-auto text-[11px] text-[var(--color-text-muted)] flex items-center gap-3">
          <span className="flex items-center gap-1"><StatusDot status="paid" /> Paid</span>
          <span className="flex items-center gap-1"><StatusDot status="ontrack" /> On plan</span>
          <span className="flex items-center gap-1"><StatusDot status="attention" /> Needs attention</span>
          <span className="flex items-center gap-1"><StatusDot status="cancelled" /> Cancelled</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${program} cohorts`}
          message={`No ${program} students recorded for this location yet.`}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((cohort) => (
            <div
              key={`${cohort.program}-${cohort.location}-${cohort.sortKey}`}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
            >
              <CohortHeader cohort={cohort} showLocation={showLocation} />
              <div className="divide-y divide-[var(--color-border)]/40">
                {cohort.students.map((s) => (
                  <button
                    key={s.studentId || s.email}
                    onClick={() => handleSelect(s)}
                    className="w-full flex items-center gap-3 py-2 px-1 text-left hover:bg-[var(--color-bg-primary)]/50 rounded transition-colors cursor-pointer"
                  >
                    <StatusDot status={s.paymentStatus} />
                    <span className={`flex-1 text-sm truncate ${
                      s.paymentStatus === 'cancelled'
                        ? 'text-[var(--color-text-muted)] line-through'
                        : 'text-[var(--color-text-primary)]'
                    }`}>
                      {s.fullName || s.email || 'Unnamed'}
                    </span>
                    {s.paymentStatus !== 'paid' && s.paymentStatus !== 'cancelled' && (
                      <span className={`text-xs ${s.paymentStatus === 'attention' ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-amber)]'}`}>
                        {formatCurrency(s.outstanding)}
                        {s.failedCount > 0 && <> · {s.failedCount} failed</>}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}
