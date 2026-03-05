import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string | null;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  className = '',
}: SelectProps) {
  return (
    <RadixSelect.Root value={value ?? undefined} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        className={`inline-flex items-center justify-between gap-2 bg-white px-3 font-sans transition-colors focus:outline-none ${className}`}
        style={{
          border: '2px solid var(--color-gray-lighter)',
          borderRadius: 'var(--border-radius)',
          padding: '0.75rem',
          fontSize: '0.9375rem',
          color: 'var(--color-gray-dark)',
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          maxWidth: '100%',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = 'var(--color-gray-light)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = 'var(--color-gray-lighter)')
        }
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.outline = 'none';
        }}
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = 'var(--color-gray-lighter)')
        }
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={14} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 bg-white shadow-lg"
          style={{
            border: '1px solid var(--color-gray-lighter)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 outline-none data-[state=checked]:font-semibold"
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--color-gray-dark)',
                  borderRadius: 'var(--border-radius)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--color-gray-lightest)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} style={{ color: 'var(--color-primary)' }} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
