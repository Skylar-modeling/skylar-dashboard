import { useState } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';

const SEVERITY = {
  red:   'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)] border-[var(--color-accent-red)]/30',
  amber: 'bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)] border-[var(--color-accent-amber)]/30',
  gray:  'bg-[var(--color-border)] text-[var(--color-text-muted)] border-[var(--color-border)]',
};

/**
 * Stale / contradictory status detector — quiet bookkeeping bugs.
 * Each row carries the issue category, a one-line explanation, and a click
 * handler that opens the student's detail modal so it can be resolved.
 */
export default function StaleStatusList({ items, data }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelect = (student) => {
    if (!student) return;
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="All status flags clean"
        message="No cancelled-but-billed students, no missing cancellation dates, no unknown status values."
      />
    );
  }

  const red = items.filter((i) => i.severity === 'red').length;
  const amber = items.filter((i) => i.severity === 'amber').length;

  return (
    <>
      <div className="flex items-center justify-end gap-4 mb-3 text-xs text-[var(--color-text-muted)]">
        <span><span className="text-[var(--color-text-secondary)]">{items.length}</span> total</span>
        {red > 0 && <span><span className="text-[var(--color-accent-red)]">{red}</span> high</span>}
        {amber > 0 && <span><span className="text-[var(--color-accent-amber)]">{amber}</span> needs review</span>}
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <button
            key={`${item.type}-${item.student?.studentId || item.student?.email || i}`}
            onClick={() => handleSelect(item.student)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[var(--color-bg-primary)]/50 transition-colors ${i > 0 ? 'border-t border-[var(--color-border)]/40' : ''}`}
          >
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border whitespace-nowrap ${SEVERITY[item.severity] || SEVERITY.gray}`}>
              {item.label}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--color-text-primary)] font-medium truncate">{item.studentName || '(Unnamed)'}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.detail}</div>
            </div>
          </button>
        ))}
      </div>

      {selectedStudent && (
        <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  );
}
