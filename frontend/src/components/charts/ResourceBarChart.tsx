import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { NAVY_COLORS } from '@/lib/constants';

interface ResourceBarChartProps {
  data: { resource_type: string; endpoint_count: number }[];
  height?: number;
}

/**
 * Horizontal bar chart for resource type distribution.
 */
export function ResourceBarChart({ data, height }: ResourceBarChartProps) {
  // Auto-size height based on number of items
  const chartHeight = height ?? Math.max(300, data.length * 28);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, bottom: 5, left: 120 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="resource_type"
          tick={{ fontSize: 11 }}
          width={110}
        />
        <Tooltip />
        <Bar dataKey="endpoint_count" fill={NAVY_COLORS.primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
