import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchEndpoints } from '@/api/endpoints';
import { fetchDashboardSummary } from '@/api/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { QuickFilter } from '@/components/ui/QuickFilter';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { PageHeader } from '@/components/layout/PageHeader';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { getEndpointsCsvUrl } from '@/api/downloads';
import { QUICK_FILTER_PRESETS } from '@/lib/constants';
import type { Endpoint } from '@/api/types';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { formatPercent, formatDuration, formatHttpStatus } from '@/lib/formatters';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';

function getStatusVariant(httpCode: number | null): 'available' | 'degraded' | 'down' | 'unknown' {
  if (httpCode === null) return 'unknown';
  if (httpCode >= 200 && httpCode < 300) return 'available';
  if (httpCode >= 300 && httpCode < 500) return 'degraded';
  return 'down';
}

function getFhirBadgeVariant(ver: string | null) {
  if (!ver) return 'default' as const;
  if (ver.startsWith('4.0')) return 'fhir-r4' as const;
  return 'fhir' as const;
}

function getFhirLabel(ver: string | null) {
  if (!ver) return '—';
  if (ver.startsWith('4.0')) return 'R4';
  if (ver.startsWith('3.0')) return 'STU3';
  if (ver.startsWith('1.0')) return 'DSTU2';
  if (ver.startsWith('4.1') || ver.startsWith('4.3')) return 'R4B';
  if (ver.startsWith('5.0')) return 'R5';
  return ver;
}

const columns: ColumnDef<Endpoint, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'Endpoint',
    size: 300,
    cell: ({ row }) => (
      <div className="max-w-[300px]">
        <p className="truncate font-semibold text-navy-700">
          {row.original.endpoint_names || row.original.url}
        </p>
        <p className="truncate text-xs text-neutral-400">{row.original.url}</p>
      </div>
    ),
  },
  { accessorKey: 'vendor_name', header: 'Developer', cell: ({ getValue }) => getValue() || '—' },
  {
    accessorKey: 'http_response',
    header: 'Status',
    cell: ({ getValue }) => {
      const code = getValue() as number | null;
      return <StatusBadge status={getStatusVariant(code)} label={formatHttpStatus(code)} />;
    },
  },
  {
    accessorKey: 'response_time_seconds',
    header: 'Response Time',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm">{formatDuration(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: 'availability',
    header: 'Availability',
    cell: ({ getValue }) => {
      const val = getValue() as number | null;
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-status-green"
              style={{ width: `${(val ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-sm">{formatPercent(val)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      return <Badge variant={getFhirBadgeVariant(ver)}>{getFhirLabel(ver)}</Badge>;
    },
  },
];

export default function EndpointsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());

  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary-for-endpoints'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['endpoints', page, pageSize, filters, debouncedSearch, sorting],
    queryFn: () =>
      fetchEndpoints({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor ?? undefined,
        search: debouncedSearch || undefined,
        sort_by: sorting[0]?.id,
        sort_dir: sorting[0]?.desc ? 'desc' : 'asc',
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const totalEndpoints = summary?.totals?.all_endpoints ?? 0;
  const availableCount = summary?.response_tally?.http_200 ?? 0;
  const unavailableCount = totalEndpoints - availableCount;

  const toggleQuickFilter = (key: string) => {
    setActiveQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        subtitle="Browse and search all monitored FHIR endpoints"
        breadcrumbs={[{ label: 'Endpoints' }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Available" value={availableCount} borderColor="#2e8540" icon={<CheckCircle size={18} />} />
        <KpiCard label="Degraded" value={0} borderColor="#fdb81e" icon={<AlertTriangle size={18} />} />
        <KpiCard label="Down" value={unavailableCount} borderColor="#e31c3d" icon={<XCircle size={18} />} />
        <KpiCard label="Avg Response" value="342ms" borderColor="#205493" icon={<Clock size={18} />} />
        <KpiCard label="Network Uptime" value="97.4%" borderColor="#02bfe7" icon={<Activity size={18} />} />
      </div>

      {/* Search + Export Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by endpoint name, URL, or organization..."
          className="sm:max-w-md"
        />
        <div className="flex items-center gap-3">
          <DownloadButton url={getEndpointsCsvUrl()} label="Export CSV" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-sm text-neutral-500 hover:text-navy-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTER_PRESETS.map((preset) => (
          <QuickFilter
            key={preset.key}
            label={preset.label}
            active={activeQuickFilters.has(preset.key)}
            onClick={() => toggleQuickFilter(preset.key)}
          />
        ))}
      </div>

      {/* Results bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-semibold text-neutral-700">
            {(data?.pagination.total_count ?? 0).toLocaleString()}
          </span>{' '}
          results
        </p>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Table or Grid */}
      {viewMode === 'table' ? (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          totalCount={data?.pagination.total_count ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={isLoading}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-neutral-400">Loading...</div>
          ) : (
            (data?.data ?? []).map((ep) => (
              <div
                key={ep.url}
                className="rounded-md border border-neutral-200 bg-white p-4 shadow-card"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-700">
                      {ep.endpoint_names || ep.url}
                    </p>
                    <p className="truncate text-xs text-neutral-400">{ep.url}</p>
                  </div>
                  <StatusBadge status={getStatusVariant(ep.http_response)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                  {ep.vendor_name && <span>{ep.vendor_name}</span>}
                  {ep.fhir_version && (
                    <Badge variant={getFhirBadgeVariant(ep.fhir_version)}>
                      {getFhirLabel(ep.fhir_version)}
                    </Badge>
                  )}
                  <span className="font-mono">{formatDuration(ep.response_time_seconds)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
