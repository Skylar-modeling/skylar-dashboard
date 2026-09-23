import { useState } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatShortDate } from '../utils/dateHelpers';

const SEVERITY = {
  red:   'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)] border-[var(--color-accent-red)]/30',
  amber: 'bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)] border-[var(--color-accent-amber)]/30',
};

/**
 * Enrollment Status Drift — Airtable vs Google Sheet mismatches.
 *
 * Red: Airtable says Cancelled, Sheet says Active — Stripe likely still
 * billing (the case we caught with Brian Maddox and Tomas Ramirez).
 * Amber: any other status mismatch (bookkeeping only).
 *
 * Clicking a row opens the student modal so it can be resolved from here.
 */
export default function EnrollmentDrift({ items, data, loading, error }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelect = (student) => {
    if (!student) return;
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  if (loading) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
        Checking Airtable…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-accent-red)]/40 rounded-xl px-4 py-6 text-center text-sm text-[var(--color-accent-red)]">
        Couldn't reach Airtable: {String(error.message || error)}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="Airtable and the sheet agree"
        message="Every enrollment's status matches between the source-of-truth Airtable table and STUDENTS_MASTER."
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
            key={item.student?.studentId || item.student?.email || i}
            onClick={() => handleSelect(item.student)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[var(--color-bg-primary)]/50 transition-colors ${i > 0 ? 'border-t border-[var(--color-border)]/40' : ''}`}
          >
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border whitespace-nowrap ${SEVERITY[item.severity] || SEVERITY.amber}`}>
              {item.severity === 'red' ? 'Cancel not synced' : 'Status mismatch'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--color-text-primary)] font-medium truncate">
                {item.airtableName || item.student.fullName || '(Unnamed)'}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Airtable says <span className="text-[var(--color-text-secondary)]">{item.airtableStatus}</span>
                {' '}· Sheet says <span className="text-[var(--color-text-secondary)]">{item.sheetStatus}</span>
                {item.cancellationDate && <> · cancel date <span className="text-[var(--color-text-secondary)]">{formatShortDate(item.cancellationDate)}</span></>}
                {item.lastModified && <> · Airtable last modified <span className="text-[var(--color-text-secondary)]">{formatShortDate(item.lastModified)}</span></>}
              </div>
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
