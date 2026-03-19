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
  getSalesOperations, getRevenueTrend, calcChange,
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

  const month = selectedMonth || (availableMonths.length > 0 ? availableMonths[0] : getCurrentMonth());
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
  const salesOps = useMemo(() => data ? getSalesOperations(data, month, location) : null, [data, month, location]);
  const cashInOffice = useMemo(() => data ? getCashInOffice(data, month) : null, [data, month]);

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
      <Layout title={`Manager Dashboard \u2014 ${locationLabel}`} lastUpdated={lastUpdated} onRefresh={refresh}>
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
    <Layout title={`Manager Dashboard \u2014 ${locationLabel}`} lastUpdated={lastUpdated} onRefresh={refresh}>
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

      {/* Section 1: Revenue & Sales */}
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

      {/* Section 2: Profitability */}
      <SectionTitle>Profitability</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(m?.cur.totalExpenses)}
          comparison={m ? comp(m.cur.totalExpenses, m.prev.totalExpenses) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Profit"
          value={formatCurrency(m?.cur.profit)}
          comparison={m ? comp(m.cur.profit, m.prev.profit) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Profit Margin"
          value={m?.cur.profitMargin != null ? formatPercent(m.cur.profitMargin) : 'N/A'}
          comparison={m ? comp(m.cur.profitMargin, m.prev.profitMargin) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Expense-to-Revenue Ratio"
          value={m?.cur.expenseRatio != null ? formatPercent(m.cur.expenseRatio) : 'N/A'}
          comparison={m ? comp(m.cur.expenseRatio, m.prev.expenseRatio) : null}
          comparisonLabel={noYoYLabel}
        />
      </div>

      {/* Section 3: Marketing Efficiency */}
      <SectionTitle>Marketing Efficiency</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Ad Spend"
          value={formatCurrency(m?.cur.adSpend)}
          comparison={m ? comp(m.cur.adSpend, m.prev.adSpend) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="ROAS"
          value={m?.cur.roas != null ? `${m.cur.roas.toFixed(2)}x` : 'N/A'}
          comparison={m ? comp(m.cur.roas, m.prev.roas) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="CPA"
          value={m?.cur.cpa != null ? formatCurrency(m.cur.cpa) : 'N/A'}
          comparison={m ? comp(m.cur.cpa, m.prev.cpa) : null}
          comparisonLabel={noYoYLabel}
        />
      </div>

      {/* Section 4: Revenue by Program */}
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

      {/* Section 5: Cash & Collections */}
      <SectionTitle>Cash &amp; Collections</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <MetricCard
          label="Cash Collected"
          value={formatCurrency(m?.cur.cashCollected)}
          comparison={m ? comp(m.cur.cashCollected, m.prev.cashCollected) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Collection Rate"
          value={m?.cur.collectionRate != null ? formatPercent(m.cur.collectionRate) : 'N/A'}
          comparison={m ? comp(m.cur.collectionRate, m.prev.collectionRate) : null}
          comparisonLabel={noYoYLabel}
        />
        <MetricCard
          label="Outstanding Receivables"
          value={formatCurrency(m?.cur.outstandingReceivables)}
        />
      </div>

      {/* Cash in Office — single location */}
      {locationCash ? (
        <ChartCard title={`Cash in Office \u2014 ${locationLabel}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Undeposited Cash', value: locationCash.undepositedCash },
              { label: 'Counted Cash', value: locationCash.countedCash },
              { label: 'Discrepancy', value: locationCash.discrepancy },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">{item.label}</div>
                <div className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      ) : (
        <EmptyState title="No cash data" message="Cash tracking data is not yet available for this location." />
      )}

      {/* Section 6: Sales Operations */}
      <SectionTitle>Sales Operations</SectionTitle>
      {salesOps ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Appointments Scheduled" value={formatNumber(salesOps.appointmentsScheduled)} />
          <MetricCard label="Show-Up Rate" value={salesOps.showUpRate != null ? formatPercent(salesOps.showUpRate) : 'N/A'} />
          <MetricCard label="Close Rate" value={salesOps.closeRate != null ? formatPercent(salesOps.closeRate) : 'N/A'} />
          <MetricCard label="No-Show Rate" value={salesOps.noShowRate != null ? formatPercent(salesOps.noShowRate) : 'N/A'} />
        </div>
      ) : (
        <EmptyState
          title="No sales activity data"
          message="Sales activity data is not yet available. This section will populate automatically once daily operations data starts flowing from Airtable."
        />
      )}

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

      <div className="h-12" />
    </Layout>
  );
}
