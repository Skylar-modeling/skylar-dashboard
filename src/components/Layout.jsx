import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import StudentSearch from './StudentSearch';
import MonthlySalesDrawer from './MonthlySalesDrawer';
import { CLERK_PUBLISHABLE_KEY } from '../config/constants';

function formatTimeAgo(date) {
  if (!date) return 'Never';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Layout({ title, children, lastUpdated, onRefresh, sheetData, filterLocation, showMonthlySales }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

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
            {showMonthlySales && sheetData && (
              <button
                onClick={() => setMonthlyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                title="Monthly Sales Overview"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-8 0h10m-13 0a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10z" />
                </svg>
                <span className="hidden sm:inline">Monthly Sales</span>
              </button>
            )}
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
            {CLERK_PUBLISHABLE_KEY && <UserMenu />}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {children}
      </main>
      {showMonthlySales && (
        <MonthlySalesDrawer
          open={monthlyOpen}
          onClose={() => setMonthlyOpen(false)}
          data={sheetData}
        />
      )}
    </div>
  );
}

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const displayName = user.firstName || user.primaryEmailAddress?.emailAddress || 'User';

  return (
    <div className="flex items-center gap-3 ml-3 border-l border-[var(--color-border)] pl-3">
      <span className="text-sm text-[var(--color-text-secondary)] hidden sm:inline">
        {displayName}
      </span>
      <button
        onClick={() => signOut()}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors cursor-pointer"
      >
        Sign out
      </button>
    </div>
  );
}
