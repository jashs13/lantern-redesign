import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
} from 'recharts';
import { NAVY_COLORS, STATUS_COLORS } from '@/lib/constants';

interface BoxPlotData {
  name: string;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
}

interface BoxPlotChartProps {
  data: BoxPlotData[];
  height?: number;
}

/**
 * Simplified box plot using Recharts bar + error bar.
 * Shows mean as bar height with std dev as error bars.
 */
export function BoxPlotChart({ data, height = 400 }: BoxPlotChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    error: [d.stdDev, d.stdDev],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="mean" fill={NAVY_COLORS.primary} radius={[4, 4, 0, 0]}>
          <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke={STATUS_COLORS.down} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
