import { formatCurrency } from '../utils/formatters';

export default function StudentDetail({ student, onClose }) {
  if (!student) return null;

  const successPayments = student.payments?.filter((p) => p.paymentStatus === 'Paid' && p.refunded !== 'Yes') || [];
  const failedPayments = student.payments?.filter((p) => p.paymentStatus === 'charge_failed') || [];
  const refundedPayments = student.payments?.filter((p) => p.refunded === 'Yes') || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {student.fullName || 'Unknown Student'}
              </h2>
              <span className="text-xs text-[var(--color-text-muted)]">Student Record</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoItem label="Email" value={student.email || '—'} />
            <InfoItem label="Phone" value={student.phone || '—'} />
            <InfoItem label="Location" value={student.location || '—'} />
          </div>

          {/* Program & Sales Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoItem label="Program" value={student.program || '—'} />
            <InfoItem label="Sales Rep" value={student.salesRep1 || '—'} />
            <InfoItem label="Start Date" value={student.startDate || '—'} />
            <InfoItem label="Deposit Method" value={student.depositMethod || '—'} />
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FinanceCard
              label="Contract Price"
              value={formatCurrency(student.contractPrice)}
              color="blue"
            />
            <FinanceCard
              label="Amount Paid"
              value={formatCurrency(student.amountPaid)}
              color="green"
            />
            <FinanceCard
              label="Outstanding"
              value={formatCurrency(student.amountOutstanding)}
              color={student.amountOutstanding > 0 ? 'amber' : 'green'}
            />
            <FinanceCard
              label="Failed Payments"
              value={student.failedPayments}
              color={student.failedPayments > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Payment History ({student.payments?.length || 0} records)
            </h3>
            {!student.payments || student.payments.length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)]">
                No payment records found
              </div>
            ) : (
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--color-bg-primary)]/50">
                      <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium">Amount</th>
                      <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium">Status</th>
                      <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">Source</th>
                      <th className="text-left px-3 py-2 text-[var(--color-text-muted)] font-medium hidden sm:table-cell">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.payments.map((p, i) => (
                      <tr
                        key={p.paymentId || i}
                        className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-primary)]/30 transition-colors"
                      >
                        <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="px-3 py-2 text-[var(--color-text-primary)] font-medium">
                          {formatCurrency(p.paymentAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={p.paymentStatus} refunded={p.refunded} />
                        </td>
                        <td className="px-3 py-2 text-[var(--color-text-muted)] hidden sm:table-cell">
                          {p.source || '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--color-text-muted)] font-mono hidden sm:table-cell">
                          {p.paymentId ? truncateId(p.paymentId) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats at bottom */}
          {student.payments && student.payments.length > 0 && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)] px-3 py-2">
                <div className="text-lg font-bold text-[var(--color-accent-green)]">{successPayments.length}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Successful</div>
              </div>
              <div className="bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)] px-3 py-2">
                <div className="text-lg font-bold text-[var(--color-accent-red)]">{failedPayments.length}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Failed</div>
              </div>
              <div className="bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)] px-3 py-2">
                <div className="text-lg font-bold text-[var(--color-accent-amber)]">{refundedPayments.length}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Refunded</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)] px-3 py-2">
      <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">{label}</div>
      <div className="text-sm text-[var(--color-text-primary)] truncate">{value}</div>
    </div>
  );
}

function FinanceCard({ label, value, color }) {
  const colorMap = {
    blue: 'var(--color-accent-blue)',
    green: 'var(--color-accent-green)',
    amber: 'var(--color-accent-amber)',
    red: 'var(--color-accent-red)',
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-[var(--color-bg-primary)]/50 rounded-lg border border-[var(--color-border)] px-3 py-2">
      <div className="text-[10px] text-[var(--color-text-muted)] mb-0.5">{label}</div>
      <div className="text-base font-bold" style={{ color: c }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status, refunded }) {
  if (refunded === 'Yes') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)]">
        Refunded
      </span>
    );
  }
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]">
        Paid
      </span>
    );
  }
  if (status === 'charge_failed') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-border)] text-[var(--color-text-muted)]">
      {status || 'Unknown'}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function truncateId(id) {
  if (!id) return '—';
  if (id.length <= 12) return id;
  return id.slice(0, 6) + '...' + id.slice(-4);
}
