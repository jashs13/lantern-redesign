import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
          >
            <Checkbox.Root
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
              className="flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white data-[state=checked]:border-navy-700 data-[state=checked]:bg-navy-700"
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
