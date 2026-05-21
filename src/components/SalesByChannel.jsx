import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import ComparisonBadge from './ComparisonBadge';
import { formatNumber, formatPercent } from '../utils/formatters';
import { calcChange } from '../utils/calculations';
import { CHART_COLORS } from '../config/constants';

function pct(v) {
  return v != null ? formatPercent(v) : '—';
}

const RateTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-xs shadow-lg">
      <p className="text-[var(--color-text-secondary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value != null ? formatPercent(entry.value) : '—'}
        </p>
      ))}
    </div>
  );
};

// Table cell: value on top, month-over-month comparison badge underneath
function Cell({ value, change }) {
  return (
    <td className="py-2 px-3 text-right align-top">
      <div className="text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-1 flex justify-end">
        <ComparisonBadge value={change} />
      </div>
    </td>
  );
}

/**
 * Sales Activity by Channel — table + bar chart.
 * `data`     = getSalesByChannel() for the selected month: { channels, total } | null
 * `prevData` = getSalesByChannel() for the comparison month: same shape | null
 *              (drives the % change trend under each value)
 */
export default function SalesByChannel({ data, prevData }) {
  if (!data || !data.channels?.length) {
    return (
      <EmptyState
        title="No channel data yet"
        message="Sales activity by channel will appear once daily logs are recorded per channel (In-Person, Phone Calls, Zoom) for this month."
      />
    );
  }

  const { channels, total } = data;
  const prevChannel = (name) => prevData?.channels?.find((c) => c.channel === name) || null;
  const prevTotal = prevData?.total || null;

  const rows = channels.map((c) => ({ cur: c, prev: prevChannel(c.channel) }));

  // Chart: show-up rate and close rate as percentages, per channel
  const chartData = channels.map((c) => ({
    channel: c.channel,
    'Show-Up Rate': c.showUpRate,
    'Close Rate': c.closeRateVsShowed,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="By Channel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Channel</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Appts Scheduled</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Show-Up Rate</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Close Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ cur, prev }) => (
                <tr key={cur.channel} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 px-3 text-[var(--color-text-primary)] align-top">{cur.channel}</td>
                  <Cell value={formatNumber(cur.scheduled)} change={prev ? calcChange(cur.scheduled, prev.scheduled) : null} />
                  <Cell value={pct(cur.showUpRate)} change={prev ? calcChange(cur.showUpRate, prev.showUpRate) : null} />
                  <Cell value={pct(cur.closeRateVsShowed)} change={prev ? calcChange(cur.closeRateVsShowed, prev.closeRateVsShowed) : null} />
                </tr>
              ))}
              <tr className="border-t border-[var(--color-border)] font-semibold">
                <td className="py-2 px-3 text-[var(--color-text-primary)] align-top">{total.channel}</td>
                <Cell value={formatNumber(total.scheduled)} change={prevTotal ? calcChange(total.scheduled, prevTotal.scheduled) : null} />
                <Cell value={pct(total.showUpRate)} change={prevTotal ? calcChange(total.showUpRate, prevTotal.showUpRate) : null} />
                <Cell value={pct(total.closeRateVsShowed)} change={prevTotal ? calcChange(total.closeRateVsShowed, prevTotal.closeRateVsShowed) : null} />
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Show-Up & Close Rate by Channel">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="channel" stroke="var(--color-text-muted)" fontSize={12} />
            <YAxis stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<RateTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Show-Up Rate" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Close Rate" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
