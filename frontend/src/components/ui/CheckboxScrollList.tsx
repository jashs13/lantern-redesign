import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface CheckboxScrollListProps {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  className?: string;
}

export function CheckboxScrollList({
  options,
  selected,
  onChange,
  className = '',
}: CheckboxScrollListProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div
      className={className}
      style={{
        border: '2px solid var(--color-gray-lighter)',
        borderRadius: 'var(--border-radius)',
        background: 'white',
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
          Remove All
        </button>
      </div>

      {/* Scrollable list */}
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
  );
}
