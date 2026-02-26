import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import clsx from 'clsx';

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-lantern-purple',
  blue: 'bg-lantern-blue',
  teal: 'bg-lantern-teal',
  green: 'bg-lantern-green',
  yellow: 'bg-lantern-yellow',
  orange: 'bg-lantern-orange',
  red: 'bg-lantern-red',
  primary: 'bg-lantern-primary',
};

interface InfoBoxProps {
  title: string;
  value: number | string;
  color?: keyof typeof COLOR_MAP;
  icon?: LucideIcon;
}

export function InfoBox({ title, value, color = 'primary', icon: Icon }: InfoBoxProps) {
  const bgClass = COLOR_MAP[color] ?? COLOR_MAP.primary;

  return (
    <div className={clsx('rounded-md p-4 text-white shadow', bgClass)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <p className="mt-1 text-sm opacity-80">{title}</p>
        </div>
        {Icon && (
          <div className="opacity-30">
            <Icon size={48} />
          </div>
        )}
      </div>
    </div>
  );
}
