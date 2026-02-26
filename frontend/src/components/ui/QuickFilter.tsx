import { clsx } from 'clsx';

interface QuickFilterProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Pill-shaped toggle button used as a quick-filter preset.
 */
export function QuickFilter({ label, active, onClick }: QuickFilterProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        active
          ? 'border-navy-700 bg-navy-700 text-white'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-navy-300 hover:text-navy-700',
      )}
    >
      {label}
    </button>
  );
}
