import { useEffect, useRef, useState } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  className = '',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const triggerLabel =
    selected.length === 0 ? `All ${placeholder}` : `${selected.length} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full items-center justify-between gap-2 bg-white font-sans transition-colors focus:outline-none"
        style={{
          border: '2px solid var(--color-gray-lighter)',
          borderRadius: 'var(--border-radius)',
          padding: '0.75rem',
          fontSize: '0.9375rem',
          color: selected.length > 0 ? 'var(--color-primary-dark)' : 'var(--color-gray-dark)',
          cursor: 'pointer',
          fontWeight: selected.length > 0 ? 600 : 400,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-gray-light)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-gray-lighter)')}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full bg-white"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            border: '1px solid var(--color-gray-lighter)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Actions */}
          <div
            className="flex gap-2 px-3 py-2"
            style={{ borderBottom: '1px solid var(--color-gray-lighter)' }}
          >
            <button
              type="button"
              onClick={() => onChange([...options])}
              className="font-sans text-xs font-semibold"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Select All
            </button>
            <span style={{ color: 'var(--color-gray-lighter)' }}>|</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-sans text-xs font-semibold"
              style={{ color: 'var(--color-gray)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Clear All
            </button>
          </div>

          {/* Checkbox list */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 font-sans text-sm"
                style={{ color: 'var(--color-gray-dark)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-lightest)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <Checkbox.Root
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 bg-white data-[state=checked]:border-navy-700 data-[state=checked]:bg-navy-700"
                >
                  <Checkbox.Indicator>
                    <Check size={12} className="text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                {option}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
