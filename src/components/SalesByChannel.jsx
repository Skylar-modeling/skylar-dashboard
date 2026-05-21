import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { formatNumber, formatPercent } from '../utils/formatters';
import { CHART_COLORS } from '../config/constants';

function pct(v) {
  return v != null ? formatPercent(v) : '—';
}

const ChannelTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-xs shadow-lg">
      <p className="text-[var(--color-text-secondary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * Sales Activity by Channel — table + bar chart.
 * `data` is the result of getSalesByChannel(): { channels: [...], total: {...} } or null.
 */
export default function SalesByChannel({ data }) {
  if (!data || !data.channels?.length) {
    return (
      <EmptyState
        title="No channel data yet"
        message="Sales activity by channel will appear once daily logs are recorded per channel (In-Person, Phone Calls, Zoom) for this month."
      />
    );
  }

  const { channels, total } = data;
  const chartData = channels.map((c) => ({
    channel: c.channel,
    Scheduled: c.scheduled,
    'Show-Ups': c.showUps,
    Enrollments: c.enrollments,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="By Channel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Channel</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Sched.</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Shows</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Enroll.</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Show %</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Close/Show</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase">Close/Sched</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 px-3 text-[var(--color-text-primary)]">{c.channel}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(c.scheduled)}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(c.showUps)}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(c.enrollments)}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-secondary)]">{pct(c.showUpRate)}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-secondary)]">{pct(c.closeRateVsShowed)}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-secondary)]">{pct(c.closeRateVsScheduled)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--color-border)] font-semibold">
                <td className="py-2 px-3 text-[var(--color-text-primary)]">{total.channel}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(total.scheduled)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(total.showUps)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{formatNumber(total.enrollments)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{pct(total.showUpRate)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{pct(total.closeRateVsShowed)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-primary)]">{pct(total.closeRateVsScheduled)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Channel Comparison">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="channel" stroke="var(--color-text-muted)" fontSize={12} />
            <YAxis stroke="var(--color-text-muted)" fontSize={12} />
            <Tooltip content={<ChannelTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Scheduled" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Show-Ups" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Enrollments" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
