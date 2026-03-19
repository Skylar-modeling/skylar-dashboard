import { useState } from 'react';

export default function DataTable({ columns, data, emptyMessage = 'No data available' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
        {emptyMessage}
      </div>
    );
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text-primary)] select-none"
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-primary)]/50">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-[var(--color-text-primary)]">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
