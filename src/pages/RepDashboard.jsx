import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Layout from '../components/Layout';
import MetricCard, { MetricCardSkeleton } from '../components/MetricCard';
import MonthSelector from '../components/MonthSelector';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import { useSheetData } from '../hooks/useSheetData';
import { LOCATIONS, CLERK_PUBLISHABLE_KEY } from '../config/constants';
import { getCurrentMonth, getPreviousMonth, getAvailableMonths } from '../utils/dateHelpers';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { calcChange } from '../utils/calculations';
import {
  findRepByEmail,
  getRepGrossCommission,
  getRepCommissionData,
  getRepSalesAndRank,
  getRepClients,
  getRepAllClients,
} from '../utils/repCalculations';

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-[var(--color-text-primary)] mt-8 mb-4">{children}</h2>;
}

function StatusBadge({ status }) {
  const colors = {
    Active: 'bg-green-500/20 text-green-400',
    Failed: 'bg-red-500/20 text-red-400',
    Dispute: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status === 'Failed' && (
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {status}
    </span>
  );
}

export default function RepDashboard() {
  const { locationSlug } = useParams();
  const location = locationSlug === 'new-york' ? LOCATIONS.NEW_YORK : LOCATIONS.MIAMI;
  const locationShort = location === LOCATIONS.NEW_YORK ? 'NYC' : 'MIA';

  const { data, loading, lastUpdated, refresh } = useSheetData();
  const availableMonths = useMemo(() => data ? getAvailableMonths(data) : [], [data]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [clientView, setClientView] = useState('month'); // 'month' | 'all'

  const month = selectedMonth || getCurrentMonth();
  const prevMonth = getPreviousMonth(month);

  // Get current user's email from Clerk
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || null;

  // Match email to sales rep
  const rep = useMemo(() => {
    if (!data) return null;
    if (userEmail) return findRepByEmail(data, userEmail);
    return null;
  }, [data, userEmail]);

  const repName = rep?.name || null;

  // Commission data
  const commission = useMemo(() => {
    if (!data || !repName) return null;
    const gross = getRepGrossCommission(data, repName, month);
    const monthlyData = getRepCommissionData(data, repName, month);
    const prevGross = getRepGrossCommission(data, repName, prevMonth);
    return { gross, ...monthlyData, prevGross };
  }, [data, repName, month, prevMonth]);

  // Sales & ranking
  const salesData = useMemo(() => {
    if (!data || !repName) return null;
    const cur = getRepSalesAndRank(data, repName, month, location);
    const prev = getRepSalesAndRank(data, repName, prevMonth, location);
    return { cur, prev };
  }, [data, repName, month, prevMonth, location]);

  // Clients
  const clients = useMemo(() => {
    if (!data || !repName) return [];
    return clientView === 'all'
      ? getRepAllClients(data, repName)
      : getRepClients(data, repName, month);
  }, [data, repName, month, clientView]);

  const alertClients = useMemo(() => {
    return clients.filter((c) => c.status === 'Failed' || c.status === 'Dispute');
  }, [clients]);

  if (loading) {
    return (
      <Layout title={`Rep ${locationShort}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  if (!rep) {
    return (
      <Layout title={`Rep ${locationShort}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
        <EmptyState
          title="Rep not found"
          message={`No sales rep profile was found matching your email${userEmail ? ` (${userEmail})` : ''}. Contact your administrator to ensure your email matches the SALES_REPS record.`}
        />
      </Layout>
    );
  }

  return (
    <Layout title={`Rep ${locationShort}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{rep.name}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{rep.primaryLocation} &middot; {(rep.commissionRate * 100).toFixed(1)}% rate</p>
        </div>
        <MonthSelector months={availableMonths.length > 0 ? availableMonths : [getCurrentMonth()]} selected={month} onChange={setSelectedMonth} />
      </div>

      {/* Section 1: Your Commission */}
      <SectionTitle>Your Commission</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Gross Commission This Month"
          value={formatCurrency(commission?.gross || 0)}
          comparison={commission ? calcChange(commission.gross, commission.prevGross) : null}
        />
        <MetricCard
          label="Outstanding (Unpaid)"
          value={formatCurrency(commission?.outstanding || 0)}
        />
        <MetricCard
          label="Commission Status"
          value={commission?.paid ? 'Paid' : 'Pending'}
        />
      </div>

      {/* Section 2: Your Sales */}
      <SectionTitle>Your Sales</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Sales This Month"
          value={formatNumber(salesData?.cur.salesCount || 0)}
          comparison={salesData ? calcChange(salesData.cur.salesCount, salesData.prev.salesCount) : null}
        />
        <MetricCard
          label="Your Ranking"
          value={salesData?.cur.salesCount > 0 ? `#${salesData.cur.rank} of ${salesData.cur.totalReps}` : 'N/A'}
        />
        <MetricCard
          label="Total Reps Active"
          value={formatNumber(salesData?.cur.totalReps || 0)}
        />
      </div>

      {/* Section 3: Payment Alerts */}
      {alertClients.length > 0 && (
        <>
          <SectionTitle>Payment Alerts</SectionTitle>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-2">
            <p className="text-sm text-red-400 font-medium mb-3">
              {alertClients.length} client{alertClients.length > 1 ? 's' : ''} with payment issues
            </p>
            <div className="space-y-2">
              {alertClients.map((c) => (
                <div key={c.email} className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.program} &middot; {c.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {c.failedCount > 0 ? `${c.failedCount} failed` : ''}
                      {c.failedCount > 0 && c.refundedCount > 0 ? ' / ' : ''}
                      {c.refundedCount > 0 ? `${c.refundedCount} refunded` : ''}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Section 4: Your Clients */}
      <SectionTitle>Your Clients</SectionTitle>
      <div className="flex gap-2 mb-4">
        {[
          { key: 'month', label: 'This Month' },
          { key: 'all', label: 'All Time' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setClientView(btn.key)}
            className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${clientView === btn.key ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {clients.length > 0 ? (
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'program', label: 'Program' },
            { key: 'contractPrice', label: 'Contract', render: (v) => formatCurrency(v) },
            { key: 'totalPaid', label: 'Paid', render: (v) => formatCurrency(v) },
            { key: 'outstanding', label: 'Outstanding', render: (v) => (
              <span className={v > 0 ? 'text-amber-400' : 'text-green-400'}>{formatCurrency(v)}</span>
            )},
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]}
          data={clients}
          emptyMessage="No clients found."
        />
      ) : (
        <EmptyState
          title="No clients yet"
          message={clientView === 'month' ? 'No sales recorded for this month.' : 'No clients found in your records.'}
        />
      )}

      <div className="h-12" />
    </Layout>
  );
}
