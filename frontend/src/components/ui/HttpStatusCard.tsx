interface HttpStatusCardProps {
  code: string;
  label: string;
  count: number;
  total: number;
  color: string;
  bgColor: string;
}

/**
 * HTTP status code distribution card used on the dashboard.
 */
export function HttpStatusCard({ code, label, count, total, color, bgColor }: HttpStatusCardProps) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

  return (
    <div
      className="rounded-md border bg-white p-4"
      style={{ borderColor: bgColor, borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {code}
        </span>
        <span className="text-xs text-neutral-400">{label}</span>
      </div>

      <p className="mt-2 font-sans text-2xl font-bold text-neutral-800">{count.toLocaleString()}</p>

      {/* Mini bar */}
      <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: bgColor }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(parseFloat(percentage), 100)}%`, backgroundColor: color }}
        />
      </div>

      <p className="mt-1 text-right text-xs font-semibold" style={{ color }}>
        {percentage}%
      </p>
    </div>
  );
}
