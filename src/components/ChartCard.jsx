export default function ChartCard({ title, children }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
      {title && (
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
