import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute top-1/2 -translate-y-1/2"
        size={20}
        style={{ left: '1rem', color: 'var(--color-gray)', pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-white font-sans transition-all"
        style={{
          padding: '0.75rem 1rem 0.75rem 3rem',
          fontSize: '1rem',
          border: '2px solid var(--color-gray-lighter)',
          borderRadius: 'var(--border-radius)',
          color: 'var(--color-gray-dark)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(32, 84, 147, 0.15)';
          e.currentTarget.style.outline = 'none';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-gray-lighter)';
          e.currentTarget.style.boxShadow = '';
        }}
        onMouseEnter={(e) => {
          if (document.activeElement !== e.currentTarget) {
            e.currentTarget.style.borderColor = 'var(--color-gray-light)';
          }
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget) {
            e.currentTarget.style.borderColor = 'var(--color-gray-lighter)';
          }
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute top-1/2 -translate-y-1/2"
          style={{ right: '0.75rem', color: 'var(--color-gray)' }}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
