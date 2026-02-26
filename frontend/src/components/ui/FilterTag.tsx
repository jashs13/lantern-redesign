import { X } from 'lucide-react';

interface FilterTagProps {
  label: string;
  value: string;
  onRemove: () => void;
}

/**
 * Active filter tag with a remove (x) button.
 */
export function FilterTag({ label, value, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-700/10 px-2.5 py-1 text-xs font-medium text-navy-900">
      <span className="text-neutral-500">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-navy-700/10 hover:text-navy-900"
        aria-label={`Remove ${label} filter`}
      >
        <X size={10} />
      </button>
    </span>
  );
}
