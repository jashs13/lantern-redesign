import { clsx } from 'clsx';

type StatusVariant = 'available' | 'degraded' | 'down' | 'unknown';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
  available: {
    dot: 'bg-status-green',
    text: 'text-status-green',
    bg: 'bg-status-green-bg',
  },
  degraded: {
    dot: 'bg-status-gold',
    text: 'text-yellow-700',
    bg: 'bg-status-gold-bg',
  },
  down: {
    dot: 'bg-status-red',
    text: 'text-status-red',
    bg: 'bg-status-red-bg',
  },
  unknown: {
    dot: 'bg-neutral-400',
    text: 'text-neutral-500',
    bg: 'bg-neutral-100',
  },
};

const DEFAULT_LABELS: Record<StatusVariant, string> = {
  available: 'Available',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = VARIANT_STYLES[status];
  const displayLabel = label ?? DEFAULT_LABELS[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        style.bg,
        style.text,
        className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', style.dot)} />
      {displayLabel}
    </span>
  );
}
