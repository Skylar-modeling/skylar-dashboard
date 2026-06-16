import { useState } from 'react';
import StudentDetail from './StudentDetail';
import EmptyState from './EmptyState';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency, formatNumber } from '../utils/formatters';

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

function AttemptBadge({ count }) {
  const color = count >= 5
    ? 'bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]'
    : count >= 3
      ? 'bg-[var(--color-accent-amber)]/20 text-[var(--color-accent-amber)]'
      : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {count}×
    </span>
  );
}

/**
 * Full dunning worklist — every failing invoice in the last 30 days.
 * Sorted by attempt count desc. Click a row to open StudentDetail.
 */
export default function DunningWorklist({ items, data }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelect = (student) => {
    if (!student) return;
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No active dunning cases"
        message="No failed-payment retries in the last 30 days. Stripe is either still processing or all invoices have settled."
      />
    );
  }

  const totalAtRisk = items.reduce((sum, i) => sum + (i.lastAmount || 0), 0);
  const repeats = items.filter((i) => i.attemptCount >= 2).length;

  return (
    <>
      <div className="flex items-center justify-end gap-4 mb-3 text-xs text-[var(--color-text-muted)]">
        <span><span className="text-[var(--color-text-secondary)]">{formatNumber(items.length)}</span> failing</span>
        <span><span className="text-[var(--color-accent-amber)]">{formatNumber(repeats)}</span> repeat offenders</span>
        <span><span className="text-[var(--color-accent-red)] font-medium">{formatCurrency(totalAtRisk)}</span> at risk</span>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/40">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Student</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Program</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Location</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Amount</th>
                <th className="text-center py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Attempts</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Days Late</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Last Try</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.invoiceId}
                  onClick={() => handleSelect(row.student)}
                  className="border-b border-[var(--color-border)]/40 hover:bg-[var(--color-bg-primary)]/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 text-[var(--color-text-primary)] font-medium">{row.studentName}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-secondary)]">{row.program || '—'}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-secondary)]">{row.studentLocation || '—'}</td>
                  <td className="py-2.5 px-4 text-right text-[var(--color-accent-red)] font-medium">{formatCurrency(row.lastAmount)}</td>
                  <td className="py-2.5 px-4 text-center"><AttemptBadge count={row.attemptCount} /></td>
                  <td className="py-2.5 px-4 text-right text-[var(--color-text-secondary)]">{row.daysDelinquent != null ? row.daysDelinquent : '—'}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-muted)]">{fmtDate(row.lastAttemptDate)}</td>
                  <td className="py-2.5 px-4 text-[var(--color-text-muted)] font-mono text-xs" title={row.invoiceId}>
                    {row.invoiceNumber || (row.invoiceId ? row.invoiceId.slice(0, 6) + '…' + row.invoiceId.slice(-4) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  );
}
