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

interface HorizontalBarChartProps {
  data: { name: string; value: number }[];
  height?: number;
  xTickFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
}

/**
 * Custom YAxis tick. For URL-like labels, shows the segment after the last '/'.
 * For plain names with no '/', shows the label as-is.
 */
function SuffixYAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const label = payload?.value ?? '';
  const lastSlash = label.lastIndexOf('/');
  const display = lastSlash >= 0 ? label.slice(lastSlash + 1) : label;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="end"
        fill="#374151"
        fontSize={11}
        fontFamily="sans-serif"
        dominantBaseline="central"
      >
        {display}
      </text>
    </g>
  );
}

/**
 * Generic horizontal bar chart used across capability sub-pages.
 * Y-axis uses the `name` field; X-axis uses the `value` field.
 */
export function HorizontalBarChart({
  data,
  height,
  xTickFormatter,
  tooltipFormatter,
}: HorizontalBarChartProps) {
  const chartHeight = height ?? Math.max(300, data.length * 30);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 180 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={xTickFormatter} />
        <YAxis
          type="category"
          dataKey="name"
          tick={<SuffixYAxisTick />}
          width={170}
          interval={0}
        />
        <Tooltip
          formatter={
            tooltipFormatter
              ? (v) => [tooltipFormatter(v as number), '']
              : undefined
          }
        />
        <Bar dataKey="value" fill={NAVY_COLORS.primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
