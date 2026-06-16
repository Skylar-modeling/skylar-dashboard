import { useState } from 'react';
import StudentDetail from './StudentDetail';
import { getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency } from '../utils/formatters';

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

function AlertCard({ severity, icon, title, count, summary, expanded, onToggle, children }) {
  const colors = severity === 'red'
    ? {
        ring: 'border-[var(--color-accent-red)]/40 hover:border-[var(--color-accent-red)]/70',
        chip: 'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]',
        icon: 'text-[var(--color-accent-red)]',
      }
    : {
        ring: 'border-[var(--color-accent-amber)]/40 hover:border-[var(--color-accent-amber)]/70',
        chip: 'bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)]',
        icon: 'text-[var(--color-accent-amber)]',
      };

  return (
    <div className={`bg-[var(--color-bg-card)] border ${colors.ring} rounded-xl transition-colors`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span className={`text-lg ${colors.icon} shrink-0`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.chip}`}>{count}</span>
          </div>
          {summary && (
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{summary}</div>
          )}
        </div>
        <span className="text-[var(--color-text-muted)] text-xs shrink-0">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && children && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]/40">
          {children}
        </div>
      )}
    </div>
  );
}

function AlertRow({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--color-bg-primary)]/50 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

/**
 * "Needs Attention" inbox — a prioritized worklist pinned to the top of the
 * dashboard. Replaces "how are we doing?" with "what needs a human now?"
 * Each card expands to show its rows. Clicking a row opens StudentDetail.
 *
 * `alerts` = { repeatedFailures: [...], cancelledButBilled: [...] }
 */
export default function NeedsAttention({ alerts, data }) {
  const [expanded, setExpanded] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const handleSelect = (student) => {
    if (!student) return;
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  };

  const repeated = alerts.repeatedFailures || [];
  const billed = alerts.cancelledButBilled || [];
  const disputes = alerts.openDisputes || [];
  const totalCount = repeated.length + billed.length + disputes.length;

  // All clear — confirm the check ran (silence is ambiguous)
  if (totalCount === 0) {
    return (
      <div className="bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-lg text-[var(--color-accent-green)]">✓</span>
        <div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">All clear</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            No open disputes, repeat-failure invoices, or post-cancellation charges.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {disputes.length > 0 && (
          <AlertCard
            severity="red"
            icon="⚠"
            title="Open disputes"
            count={disputes.length}
            summary="Stripe pulled funds — respond before deadline or money is lost"
            expanded={!!expanded.disputes}
            onToggle={() => toggle('disputes')}
          >
            {disputes.map((d) => (
              <AlertRow key={d.key} onClick={() => handleSelect(d.student)}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-text-primary)] font-medium truncate">{d.studentName}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {d.latestEvent.replace('charge.dispute.', '')} · {fmtDate(d.latestDate)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-[var(--color-accent-red)]">{formatCurrency(d.amount)}</div>
                </div>
              </AlertRow>
            ))}
          </AlertCard>
        )}

        {repeated.length > 0 && (
          <AlertCard
            severity="red"
            icon="!"
            title="Payments failing 2+ times"
            count={repeated.length}
            summary={`Most attempts: ${repeated[0].studentName} (${repeated[0].attemptCount}×)`}
            expanded={!!expanded.repeated}
            onToggle={() => toggle('repeated')}
          >
            {repeated.map((r) => (
              <AlertRow key={r.invoiceId} onClick={() => handleSelect(r.student)}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-text-primary)] font-medium truncate">{r.studentName}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {r.invoiceNumber || r.invoiceId} · last failed {fmtDate(r.lastAttemptDate)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-[var(--color-accent-red)]">{r.attemptCount} failed</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{formatCurrency(r.lastAmount)}</div>
                </div>
              </AlertRow>
            ))}
          </AlertCard>
        )}

        {billed.length > 0 && (
          <AlertCard
            severity="red"
            icon="!"
            title="Cancelled but charged after"
            count={billed.length}
            summary="Refund or chargeback risk — payments fired past cancel date"
            expanded={!!expanded.billed}
            onToggle={() => toggle('billed')}
          >
            {billed.map((b) => (
              <AlertRow key={b.studentEmail} onClick={() => handleSelect(b.student)}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-text-primary)] font-medium truncate">{b.studentName}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    Cancelled {fmtDate(b.cancellationDate)} · {b.postCancelCount} charge{b.postCancelCount !== 1 ? 's' : ''} after
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-[var(--color-accent-red)]">{formatCurrency(b.postCancelTotal)}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">last {fmtDate(b.lastChargeDate)}</div>
                </div>
              </AlertRow>
            ))}
          </AlertCard>
        )}
      </div>

      {selectedStudent && (
        <StudentDetail student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  );
}
