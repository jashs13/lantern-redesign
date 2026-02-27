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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-200 bg-white py-2.5 pl-10 pr-9 text-sm placeholder:text-neutral-400 focus:border-navy-700 focus:outline-none focus:ring-1 focus:ring-navy-700"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
