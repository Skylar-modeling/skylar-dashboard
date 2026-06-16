import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import Layout from '../components/Layout';
import MetricCard, { MetricCardSkeleton } from '../components/MetricCard';
import MonthSelector from '../components/MonthSelector';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';
import SalesByChannel from '../components/SalesByChannel';
import OpenAccountsList from '../components/OpenAccountsList';
import CohortRoster from '../components/CohortRoster';
import NeedsAttention from '../components/NeedsAttention';
import DunningWorklist from '../components/DunningWorklist';
import ARAging from '../components/ARAging';
import StaleStatusList from '../components/StaleStatusList';
import ActivityFeed from '../components/ActivityFeed';
import {
  getOpenAccounts, getCohorts, getRepeatedFailures, getCancelledButBilled, getOpenDisputes,
  getDunningList, getARAging, getStaleStatusItems, getRecentActivity,
} from '../utils/studentCalculations';
import { useSheetData } from '../hooks/useSheetData';
import { LOCATIONS, PROGRAM_COLORS, CHART_COLORS } from '../config/constants';
import {
  getCurrentMonth, getPreviousMonth, getSameMonthLastYear,
  getAvailableMonths, getLast6Months, formatMonthDisplay,
} from '../utils/dateHelpers';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import {
  getRevenueSales, getSalesCount, getAverageDealSize, getActualizedRevenue,
  getTotalExpenses, getProfit, getProfitMargin, getExpenseToRevenueRatio,
  getAdSpend, getROAS, getCPA, getRevenueByProgram,
  getCashCollected, getCollectionRate, getOutstandingReceivables, getCashInOffice,
  getSalesByChannel, getRevenueTrend, calcChange,
} from '../utils/calculations';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-xs shadow-lg">
      <p className="text-[var(--color-text-secondary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-[var(--color-text-primary)] mt-8 mb-4">{children}</h2>;
}

export default function ManagerDashboard() {
  const { locationSlug } = useParams();
  const location = locationSlug === 'new-york' ? LOCATIONS.NEW_YORK : LOCATIONS.MIAMI;
  const locationLabel = location;

  const { data, loading, lastUpdated, refresh } = useSheetData();
  const availableMonths = useMemo(() => data ? getAvailableMonths(data) : [], [data]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [comparisonMode, setComparisonMode] = useState('prev'); // 'prev' | 'yoy'
  const [agingBucket, setAgingBucket] = useState(null);

  const month = selectedMonth || getCurrentMonth();
  const compMonth = comparisonMode === 'prev' ? getPreviousMonth(month) : getSameMonthLastYear(month);

  const metrics = useMemo(() => {
    if (!data) return null;
    const isManager = true;
    const cur = {
      revenueSales: getRevenueSales(data, month, location),
      salesCount: getSalesCount(data, month, location),
      avgDeal: getAverageDealSize(data, month, location),
      actualizedRevenue: getActualizedRevenue(data, month, location),
      totalExpenses: getTotalExpenses(data, month, location, isManager),
      profit: getProfit(data, month, location, isManager),
      profitMargin: getProfitMargin(data, month, location, isManager),
      expenseRatio: getExpenseToRevenueRatio(data, month, location, isManager),
      adSpend: getAdSpend(data, month, location),
      roas: getROAS(data, month, location),
      cpa: getCPA(data, month, location),
      cashCollected: getCashCollected(data, month, location),
      collectionRate: getCollectionRate(data, month, location),
      outstandingReceivables: getOutstandingReceivables(data, location),
    };
    const prev = {
      revenueSales: getRevenueSales(data, compMonth, location),
      salesCount: getSalesCount(data, compMonth, location),
      avgDeal: getAverageDealSize(data, compMonth, location),
      actualizedRevenue: getActualizedRevenue(data, compMonth, location),
      totalExpenses: getTotalExpenses(data, compMonth, location, isManager),
      profit: getProfit(data, compMonth, location, isManager),
      profitMargin: getProfitMargin(data, compMonth, location, isManager),
      expenseRatio: getExpenseToRevenueRatio(data, compMonth, location, isManager),
      adSpend: getAdSpend(data, compMonth, location),
      roas: getROAS(data, compMonth, location),
      cpa: getCPA(data, compMonth, location),
      cashCollected: getCashCollected(data, compMonth, location),
      collectionRate: getCollectionRate(data, compMonth, location),
    };
    return { cur, prev };
  }, [data, month, compMonth, location]);

  const programData = useMemo(() => data ? getRevenueByProgram(data, month, location) : [], [data, month, location]);
  const salesByChannel = useMemo(() => data ? getSalesByChannel(data, month, location) : null, [data, month, location]);
  const prevSalesByChannel = useMemo(() => data ? getSalesByChannel(data, compMonth, location) : null, [data, compMonth, location]);
  const cashInOffice = useMemo(() => data ? getCashInOffice(data, month) : null, [data, month]);
  const openAccounts = useMemo(() => data ? getOpenAccounts(data, location) : [], [data, location]);
  const cohorts = useMemo(() => data ? getCohorts(data, location) : [], [data, location]);
  const alerts = useMemo(() => ({
    repeatedFailures: data ? getRepeatedFailures(data, location) : [],
    cancelledButBilled: data ? getCancelledButBilled(data, location) : [],
    openDisputes: data ? getOpenDisputes(data, location) : [],
  }), [data, location]);
  const dunningList = useMemo(() => data ? getDunningList(data, location) : [], [data, location]);
  const arAging = useMemo(() => getARAging(data, location), [data, location]);
  const staleStatus = useMemo(() => data ? getStaleStatusItems(data, location) : [], [data, location]);
  const recentActivity = useMemo(() => data ? getRecentActivity(data, location, 7) : [], [data, location]);

  const locationCash = useMemo(() => {
    if (!cashInOffice) return null;
    const key = location === LOCATIONS.NEW_YORK ? 'ny' : 'miami';
    return cashInOffice[key];
  }, [cashInOffice, location]);

  const trendData = useMemo(() => {
    if (!data) return [];
    const months = getLast6Months(month);
    return getRevenueTrend(data, months, location).map((d) => ({
      ...d,
      monthLabel: formatMonthDisplay(d.month),
    }));
  }, [data, month, location]);

  // For YoY, check if comparison data has any values
  const hasComparisonData = useMemo(() => {
    if (!metrics) return false;
    const p = metrics.prev;
    return p.revenueSales > 0 || p.salesCount > 0 || p.actualizedRevenue > 0;
  }, [metrics]);

  const noYoYLabel = comparisonMode === 'yoy' && !hasComparisonData ? 'No prior year data' : undefined;

  function comp(curVal, prevVal) {
    if (noYoYLabel) return null;
    return calcChange(curVal, prevVal);
  }

  const m = metrics;

  if (loading) {
    return (
      <Layout title={`Manager Dashboard \u2014 ${locationLabel}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton h-9 w-36" />
          <div className="skeleton h-9 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Manager Dashboard \u2014 ${locationLabel}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <MonthSelector months={availableMonths.length > 0 ? availableMonths : [getCurrentMonth()]} selected={month} onChange={setSelectedMonth} />
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          <button
            onClick={() => setComparisonMode('prev')}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${comparisonMode === 'prev' ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            vs Previous Month
          </button>
          <button
            onClick={() => setComparisonMode('yoy')}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${comparisonMode === 'yoy' ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            vs Same Month Last Year
          </button>
        </div>
      </div>

      {/* Section 1: Needs Attention — prioritized worklist pinned to the very top */}
      <SectionTitle>Needs Attention</SectionTitle>
      <NeedsAttention alerts={alerts} data={data} />

      {/* Section 2: Recent Activity — chronological 7-day feed of every meaningful event */}
      <SectionTitle>Recent Activity (last 7 days)</SectionTitle>
      <ActivityFeed events={recentActivity} data={data} />

      {/* Section 3: AR Aging — clickable buckets drill into Open Accounts below */}
      <SectionTitle>Accounts Receivable Aging</SectionTitle>
      <ARAging
        buckets={arAging}
        selectedKey={agingBucket?.key || null}
        onBucketClick={(b) => {
          setAgingBucket(b);
          if (b) {
            requestAnimationFrame(() => {
              const el = document.getElementById('open-accounts-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        }}
      />

      {/* Section 4: Revenue & Sales */}
      <SectionTitle>Revenue &amp; Sales</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue (Sales)"
          value={formatCurrency(m?.cur.revenueSales)}
          comparison={m ? comp(m.cur.revenueSales, m.prev.revenueSales) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="# of Sales"
          value={formatNumber(m?.cur.salesCount)}
          comparison={m ? comp(m.cur.salesCount, m.prev.salesCount) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Average Deal Size"
          value={m?.cur.avgDeal != null ? formatCurrency(m.cur.avgDeal) : 'N/A'}
          comparison={m ? comp(m.cur.avgDeal, m.prev.avgDeal) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Actualized Revenue"
          value={formatCurrency(m?.cur.actualizedRevenue)}
          comparison={m ? comp(m.cur.actualizedRevenue, m.prev.actualizedRevenue) : null}
          comparisonLabel={noYoYLabel}
        />
      </div>

      {/* Section 5: Revenue by Program */}
      <SectionTitle>Revenue by Program</SectionTitle>
      {programData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Breakdown">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={programData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="var(--color-text-muted)" fontSize={12} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                  {programData.map((entry) => (
                    <Cell key={entry.name} fill={PROGRAM_COLORS[entry.name] || CHART_COLORS.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={programData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {programData.map((entry) => (
                    <Cell key={entry.name} fill={PROGRAM_COLORS[entry.name] || CHART_COLORS.muted} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : (
        <EmptyState title="No program data" message="Revenue by program data is not yet available for this month." />
      )}

      {/* Profitability / Marketing Efficiency / Cash & Collections removed from Manager view per layout request */}

      {/* Section 6: Sales Activity by Channel */}
      <SectionTitle>Sales Activity by Channel</SectionTitle>
      <SalesByChannel data={salesByChannel} prevData={prevSalesByChannel} />

      {/* Section 7: Revenue Trend */}
      <SectionTitle>Revenue Trend (6 Months)</SectionTitle>
      {trendData.length > 0 ? (
        <ChartCard>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="monthLabel" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="revenueSales" name="Revenue (Sales)" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="actualizedRevenue" name="Actualized Revenue" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="totalExpenses" name="Total Expenses" stroke={CHART_COLORS.red} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <EmptyState title="No trend data" message="Revenue trend data will appear once multiple months of data are available." />
      )}

      {/* Section 8: Per-cohort class roster — scan workflow for "is anyone misplaced?" */}
      <SectionTitle>Class Roster by Cohort</SectionTitle>
      <CohortRoster cohorts={cohorts} data={data} location={location} />

      {/* Section 9: Dunning Worklist — all failing invoices in last 30 days (scrollable) */}
      <SectionTitle>Dunning Worklist</SectionTitle>
      <DunningWorklist items={dunningList} data={data} />

      {/* Section 10: Open Accounts (drill-down of Outstanding Receivables; scrollable + AR-Aging-filterable) */}
      <div id="open-accounts-section" />
      <SectionTitle>Open Accounts</SectionTitle>
      <OpenAccountsList
        accounts={openAccounts}
        data={data}
        agingBucket={agingBucket}
        onClearAging={() => setAgingBucket(null)}
      />

      {/* Section 11: Stale Status — contradictory enrollment / cancellation states (audit safeguard) */}
      <SectionTitle>Stale Status</SectionTitle>
      <StaleStatusList items={staleStatus} data={data} />

      <div className="h-12" />
    </Layout>
  );
}
