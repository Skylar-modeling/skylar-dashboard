import { formatMonthDisplay } from '../utils/dateHelpers';

export default function MonthSelector({ months, selected, onChange }) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] cursor-pointer"
    >
      {months.map((m) => (
        <option key={m} value={m}>
          {formatMonthDisplay(m)}
        </option>
      ))}
    </select>
  );
}
