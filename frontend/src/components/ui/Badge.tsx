import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'fhir-r4' | 'fhir' | 'navy';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-status-green-bg text-status-green',
  warning: 'bg-status-gold-bg text-yellow-800',
  error: 'bg-status-red-bg text-status-red',
  info: 'bg-sky-500/10 text-sky-600',
  'fhir-r4': 'bg-sky-500/15 text-sky-600 font-semibold',
  fhir: 'bg-neutral-100 text-neutral-600',
  navy: 'bg-navy-700/10 text-navy-700',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
