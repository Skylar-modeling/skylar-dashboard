export default function EmptyState({ title, message }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
      <div className="text-3xl mb-3 opacity-50">&#128202;</div>
      <h4 className="text-[var(--color-text-primary)] font-medium mb-2">{title || 'No data available'}</h4>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
        {message || 'This section will populate once data starts flowing from Airtable.'}
      </p>
    </div>
  );
}
