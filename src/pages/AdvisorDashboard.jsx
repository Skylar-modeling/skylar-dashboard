import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { MetricCardSkeleton } from '../components/MetricCard';
import MonthSelector from '../components/MonthSelector';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import SalesByChannel from '../components/SalesByChannel';
import { useSheetData } from '../hooks/useSheetData';
import { LOCATIONS } from '../config/constants';
import {
  getCurrentMonth, getPreviousMonth, getAvailableMonths,
} from '../utils/dateHelpers';
import { getSalesByChannel } from '../utils/calculations';

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-[var(--color-text-primary)] mt-8 mb-4">{children}</h2>;
}

/**
 * Get top sales reps ranked by sales count — NO financial data (no revenue, no commission).
 */
function getRepRanking(data, month, location) {
  if (!data?.STUDENTS_MASTER) return [];

  const students = data.STUDENTS_MASTER.filter((s) => {
    if (!s.depositDate) return false;
    const depMonth = s.depositDate.length > 7 ? s.depositDate.slice(0, 7) : s.depositDate;
    if (depMonth !== month) return false;
    if (location && location !== 'ALL' && s.location !== location) return false;
    return true;
  });

  const repMap = {};
  students.forEach((s) => {
    const rep = s.salesRep1;
    if (!rep) return;
    if (!repMap[rep]) repMap[rep] = { name: rep, salesCount: 0 };
    repMap[rep].salesCount += 1;
  });

  return Object.values(repMap).sort((a, b) => b.salesCount - a.salesCount);
}

export default function AdvisorDashboard() {
  const { locationSlug } = useParams();
  const location = locationSlug === 'new-york' ? LOCATIONS.NEW_YORK : LOCATIONS.MIAMI;
  const locationShort = location === LOCATIONS.NEW_YORK ? 'NYC' : 'MIA';

  const { data, loading, lastUpdated, refresh } = useSheetData();
  const availableMonths = useMemo(() => data ? getAvailableMonths(data) : [], [data]);
  const [selectedMonth, setSelectedMonth] = useState('');

  const month = selectedMonth || getCurrentMonth();
  const prevMonth = getPreviousMonth(month);

  const salesByChannel = useMemo(() => data ? getSalesByChannel(data, month, location) : null, [data, month, location]);
  const prevSalesByChannel = useMemo(() => data ? getSalesByChannel(data, prevMonth, location) : null, [data, prevMonth, location]);

  const repRanking = useMemo(() => data ? getRepRanking(data, month, location) : [], [data, month, location]);

  const repColumns = [
    { key: 'rank', label: '#', render: (_, __, i) => i + 1 },
    { key: 'name', label: 'Sales Rep' },
    { key: 'salesCount', label: 'Sales This Month' },
  ];

  if (loading) {
    return (
      <Layout title={`Advisor ${locationShort}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Advisor ${locationShort}`} lastUpdated={lastUpdated} onRefresh={refresh} sheetData={data} filterLocation={location}>
      {/* Month selector */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <MonthSelector months={availableMonths.length > 0 ? availableMonths : [getCurrentMonth()]} selected={month} onChange={setSelectedMonth} />
      </div>

      {/* Section 1: Sales Activity by Channel */}
      <SectionTitle>Sales Activity by Channel</SectionTitle>
      <SalesByChannel data={salesByChannel} prevData={prevSalesByChannel} />

      {/* Section 2: Sales Rep Ranking */}
      <SectionTitle>Sales Rep Ranking</SectionTitle>
      {repRanking.length > 0 ? (
        <DataTable
          columns={repColumns}
          data={repRanking}
          emptyMessage="No sales data for this month."
        />
      ) : (
        <EmptyState
          title="No sales data"
          message="Sales rep ranking will appear once enrollments are recorded for this month."
        />
      )}

      <div className="h-12" />
    </Layout>
  );
}
