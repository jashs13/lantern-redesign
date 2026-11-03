import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  borderColor?: string;
  subtitle?: string;
  smallValue?: boolean;
  icon?: ReactNode;
}

/**
 * One segment of a KpiStrip — a colour dot + label, value, and optional
 * subtitle. Render several inside a `.kpi-strip` container so they read as
 * one grouped metrics component, not floating cards.
 */
export function KpiCard({ label, value, borderColor = 'var(--blue-700)', subtitle, smallValue, icon }: KpiCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="kpi-seg">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: borderColor }} />
        {label}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <p
          className={`min-w-0 font-sans font-bold text-neutral-800 ${smallValue ? 'truncate text-base' : 'break-words text-2xl'}`}
          title={smallValue ? String(displayValue) : undefined}
        >
          {displayValue}
        </p>
        {icon && <span className="shrink-0 text-neutral-300">{icon}</span>}
      </div>
      {subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );
}
