import { LayoutGrid, List } from 'lucide-react';
import { clsx } from 'clsx';

type ViewMode = 'table' | 'grid';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * Table/Grid view toggle.
 */
export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 bg-white">
      <button
        onClick={() => onChange('table')}
        className={clsx(
          'flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-medium transition-colors',
          mode === 'table'
            ? 'bg-navy-700 text-white'
            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700',
        )}
        aria-label="Table view"
      >
        <List size={14} />
        Table
      </button>
      <button
        onClick={() => onChange('grid')}
        className={clsx(
          'flex items-center gap-1.5 rounded-r-md border-l border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors',
          mode === 'grid'
            ? 'bg-navy-700 text-white'
            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700',
        )}
        aria-label="Grid view"
      >
        <LayoutGrid size={14} />
        Grid
      </button>
    </div>
  );
}
