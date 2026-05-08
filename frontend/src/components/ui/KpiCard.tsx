import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  borderColor?: string;
  subtitle?: string;
  smallValue?: boolean;
  change?: {
    value: string;
    direction: 'up' | 'down';
    label?: string;
  };
  icon?: React.ReactNode;
}

/**
 * KPI card with coloured left border, used on dashboard/endpoints for key metrics.
 */
export function KpiCard({ label, value, borderColor = '#0f2f8a', subtitle, smallValue, change, icon }: KpiCardProps) {
  return (
    <div
      className="kpi-card flex items-start justify-between"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className={`mt-1 font-sans font-bold text-neutral-800 ${smallValue ? 'text-base whitespace-nowrap' : 'text-2xl break-words'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
        )}
        {change && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-semibold ${change.direction === 'up' ? 'text-status-green' : 'text-status-red'
              }`}
          >
            {change.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change.value}
            {change.label && (
              <span className="font-normal text-neutral-400"> {change.label}</span>
            )}
          </p>
        )}
      </div>
      {icon && <div className="ml-3 text-neutral-300">{icon}</div>}
    </div>
  );
}
