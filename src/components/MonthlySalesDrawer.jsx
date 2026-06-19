import { useState, useEffect, useMemo } from 'react';
import { getMonthlySalesOverview } from '../utils/studentCalculations';
import { formatCurrency } from '../utils/formatters';

function fmtMonth(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${y}`;
}

function downloadCsv(rows) {
  if (!rows.length) return;
  const header = ['Month', '# Sales NY', '# Sales Miami', 'Total Sold NY', 'Total Sold Miami', 'Refunds', 'Net Sold'];
  const body = rows.map((r) => [
    r.month, r.nySales, r.miamiSales, r.nyTotal, r.miamiTotal, r.refunds, r.netSold,
  ]);
  const csv = [header, ...body].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monthly-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatusPill({ status }) {
  const s = (status || '').toLowerCase();
  const cls = s === 'cancelled'
    ? 'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]'
    : s === 'completed'
      ? 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]'
      : 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

function highlight(text, query) {
  if (!query || !text) return text;
  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--color-accent-amber)]/30 text-[var(--color-text-primary)] rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function MonthlySalesDrawer({ open, onClose, data }) {
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState('');

  // Compute overview once per open. Recompute when `open` flips true so reopen picks up fresh data.
  const overview = useMemo(() => open && data ? getMonthlySalesOverview(data) : [], [open, data]);

  // Reset state when the drawer closes
  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setQuery('');
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // When user types a search, auto-expand the first matching month
  useEffect(() => {
    if (!query || query.trim().length < 2) return;
    const q = query.trim().toLowerCase();
    const match = overview.find((row) =>
      row.students.some((s) => (s.fullName || '').toLowerCase().includes(q))
    );
    if (match) setExpanded(match.month);
  }, [query, overview]);

  if (!open) return null;

  const q = query.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[720px] bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Monthly Sales Overview</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Showing all months with sales activity (sorted newest first)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer p-1"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar — search + CSV */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name…"
            maxLength={50}
            className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-blue)]"
          />
          <button
            onClick={() => downloadCsv(overview)}
            disabled={!overview.length}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {overview.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
              No sales activity in any month yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--color-bg-primary)]/95 backdrop-blur">
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-3 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider w-32">Month</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">NY #</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">MIA #</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">NY Sold</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">MIA Sold</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Refunds</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Net Sold</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((row) => {
                  const isOpen = expanded === row.month;
                  // Filter students by search inside the drill-down
                  const visibleStudents = q
                    ? row.students.filter((s) => (s.fullName || '').toLowerCase().includes(q))
                    : row.students;
                  return (
                    <RowGroup
                      key={row.month}
                      row={row}
                      isOpen={isOpen}
                      onToggle={() => setExpanded(isOpen ? null : row.month)}
                      visibleStudents={visibleStudents}
                      hasFilter={!!q}
                      query={q}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function RowGroup({ row, isOpen, onToggle, visibleStudents, hasFilter, query }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-card)]/60 cursor-pointer transition-colors"
      >
        <td className="py-2.5 px-3 text-[var(--color-text-primary)] font-medium">
          <span className="inline-block w-3 text-[var(--color-text-muted)] mr-1">{isOpen ? '▾' : '▸'}</span>
          {fmtMonth(row.month)}
        </td>
        <td className="py-2.5 px-2 text-right text-[var(--color-text-primary)]">{row.nySales}</td>
        <td className="py-2.5 px-2 text-right text-[var(--color-text-primary)]">{row.miamiSales}</td>
        <td className="py-2.5 px-2 text-right text-[var(--color-text-primary)]">{formatCurrency(row.nyTotal)}</td>
        <td className="py-2.5 px-2 text-right text-[var(--color-text-primary)]">{formatCurrency(row.miamiTotal)}</td>
        <td className={`py-2.5 px-2 text-right ${row.refunds > 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-muted)]'}`}>
          {row.refunds > 0 ? `-${formatCurrency(row.refunds)}` : formatCurrency(0)}
        </td>
        <td className="py-2.5 px-3 text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(row.netSold)}</td>
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={7} className="bg-[var(--color-bg-card)]/40 border-b border-[var(--color-border)]/40 px-3 py-3">
            {visibleStudents.length === 0 ? (
              <div className="text-center text-xs text-[var(--color-text-muted)] py-3">
                {hasFilter ? `No students matching "${query}" in this month.` : 'No students in this month.'}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-text-muted)]">
                    <th className="text-left py-1.5 px-2 font-medium">Location</th>
                    <th className="text-left py-1.5 px-2 font-medium">Student</th>
                    <th className="text-left py-1.5 px-2 font-medium">Email</th>
                    <th className="text-right py-1.5 px-2 font-medium">Contract</th>
                    <th className="text-right py-1.5 px-2 font-medium">Refund</th>
                    <th className="text-right py-1.5 px-2 font-medium">Recog. Rev</th>
                    <th className="text-left py-1.5 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s) => (
                    <tr key={s.studentId || s.email} className="border-t border-[var(--color-border)]/30">
                      <td className="py-1.5 px-2 text-[var(--color-text-secondary)]">{s.location}</td>
                      <td className="py-1.5 px-2 text-[var(--color-text-primary)] font-medium">
                        {highlight(s.fullName || '—', hasFilter ? query : '')}
                      </td>
                      <td className="py-1.5 px-2 text-[var(--color-text-muted)] truncate max-w-[200px]" title={s.email}>{s.email}</td>
                      <td className="py-1.5 px-2 text-right text-[var(--color-text-primary)]">{formatCurrency(s.contractPrice)}</td>
                      <td className={`py-1.5 px-2 text-right ${s.refundAmount > 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-muted)]'}`}>
                        {s.refundAmount > 0 ? `-${formatCurrency(s.refundAmount)}` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--color-text-secondary)]">{formatCurrency(s.recognizedRevenue)}</td>
                      <td className="py-1.5 px-2"><StatusPill status={s.enrollmentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
