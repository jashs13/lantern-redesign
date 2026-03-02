import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Pagination } from './Pagination';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  isLoading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  totalCount,
  page,
  pageSize,
  onPageChange,
  sorting = [],
  onSortingChange,
  isLoading = false,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  if (isLoading) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      {/* Table card */}
      <div className="overflow-hidden rounded-md bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm" style={{ minWidth: '800px' }}>
            <thead style={{ background: 'var(--color-gray-lightest)' }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-4 text-left font-bold uppercase"
                      style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em',
                        color: 'var(--color-gray-dark)',
                        borderBottom: '2px solid var(--color-gray-lighter)',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' && <ArrowUp size={14} />}
                            {header.column.getIsSorted() === 'desc' && <ArrowDown size={14} />}
                            {!header.column.getIsSorted() && (
                              <ArrowUpDown size={14} className="opacity-40" />
                            )}
                          </>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--color-gray-lightest)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--color-gray-lightest)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="break-all px-4 py-4 align-middle"
                      style={{ color: 'var(--color-gray-dark)', verticalAlign: 'middle' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
}
