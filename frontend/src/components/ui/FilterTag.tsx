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
    <span
      className="inline-flex items-center gap-2 font-sans font-semibold"
      style={{
        padding: '0.5rem 0.75rem',
        background: 'rgba(32, 84, 147, 0.1)',
        color: 'var(--color-primary-dark)',
        borderRadius: '50px',
        fontSize: '0.8125rem',
      }}
    >
      <span style={{ color: 'var(--color-gray)' }}>{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="flex items-center justify-center p-0 leading-none"
        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
        aria-label={`Remove ${label} filter`}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary-dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
      >
        <X size={14} />
      </button>
    </span>
  );
}
