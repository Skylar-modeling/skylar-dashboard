import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import StudentSearch from './StudentSearch';

function formatTimeAgo(date) {
  if (!date) return 'Never';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Layout({ title, children, lastUpdated, onRefresh, sheetData, filterLocation }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [refreshCooldown, setRefreshCooldown] = useState(false);

  const handleRefresh = useCallback(() => {
    if (refreshCooldown || !onRefresh) return;
    onRefresh();
    setRefreshCooldown(true);
    setTimeout(() => setRefreshCooldown(false), 30000);
  }, [refreshCooldown, onRefresh]);

  if (isHome) return children;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-[var(--color-bg-primary)]/95 backdrop-blur border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
            >
              &larr; Switch view
            </Link>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {sheetData && (
              <StudentSearch data={sheetData} location={filterLocation} />
            )}
            {lastUpdated && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshCooldown}
                className={`text-xs transition-colors cursor-pointer ${refreshCooldown ? 'text-[var(--color-text-muted)] cursor-not-allowed' : 'text-[var(--color-accent-blue)] hover:text-[var(--color-accent-blue)]/80'}`}
              >
                {refreshCooldown ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
