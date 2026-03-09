import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchEndpoints, fetchEndpointsCount } from '@/api/endpoints';
import { fetchDashboardSummary } from '@/api/dashboard';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { QuickFilter } from '@/components/ui/QuickFilter';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { PageHeader } from '@/components/layout/PageHeader';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { getEndpointsCsvUrl } from '@/api/downloads';
import { EndpointDetailModal } from './EndpointDetailModal';
import type { Endpoint } from '@/api/types';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { formatPercent, formatDuration, formatHttpStatus } from '@/lib/formatters';
import {
  CheckCircle,
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

function buildColumns(onOpenDetail: (url: string) => void): ColumnDef<Endpoint, unknown>[] {
  return [
  {
    accessorKey: 'url',
    header: 'Endpoint',
    size: 30,
    cell: ({ row }) => (
      <div className="min-w-0 max-w-[300px]">
        <button
          type="button"
          className="truncate block w-full text-left font-semibold text-navy-700 text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-1 rounded-sm"
          onClick={() => onOpenDetail(row.original.url)}
        >
          {row.original.endpoint_names || row.original.url}
        </button>
        <p className="truncate text-xs text-neutral-400">{row.original.url}</p>
      </div>
    ),
  },
  {
    accessorKey: 'vendor_name',
    header: 'Developer',
    size: 20,
    cell: ({ getValue }) => (
      <span className="truncate block text-xs">{(getValue() as string | null) || '—'}</span>
    ),
  },
  {
    accessorKey: 'http_response',
    header: 'Status',
    size: 14,
    cell: ({ getValue }) => {
      const code = getValue() as number | null;
      return (
        <StatusBadge
          status={getStatusVariant(code)}
          label={formatHttpStatus(code)}
          className="px-1.5 py-0.5 whitespace-nowrap"
        />
      );
    },
  },
  {
    accessorKey: 'response_time_seconds',
    header: 'Resp. Time',
    size: 12,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{formatDuration(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: 'availability',
    header: 'Availability',
    size: 14,
    cell: ({ getValue }) => {
      const val = getValue() as number | null;
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-status-green"
              style={{ width: `${(val ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-xs whitespace-nowrap">{formatPercent(val)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Ver.',
    size: 10,
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      return <Badge variant={getFhirBadgeVariant(ver)}>{getFhirLabel(ver)}</Badge>;
    },
  },
  ];
}



export default function EndpointsPage() {
  const { filters, setSource, setFhirVersions } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [vendor, setVendor] = useState<string | null>(searchParams.get('vendor') || null);
  const debouncedSearch = useDebounce(search, 500);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  // High-uptime filter: availability >= 99%
  const [highUptimeOnly, setHighUptimeOnly] = useState(false);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const columns = useMemo(
    () => buildColumns((url) => setSelectedEndpointUrl(url)),
    [],
  );

  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary-for-endpoints'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });



  const filterParams = {
    fhir_versions: filters.fhirVersions.length > 0 ? filters.fhirVersions : undefined,
    vendor: vendor || filters.vendor || undefined,
    availability: highUptimeOnly ? '99-100' : undefined,
    source: filters.source || undefined,
    search: debouncedSearch || undefined,
  };
  const filterKey = [filters, debouncedSearch, vendor, highUptimeOnly];

  // Count query: keyed by filters only — does NOT include page, so pagination doesn't retrigger it
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['endpoints-count', ...filterKey],
    queryFn: () => fetchEndpointsCount(filterParams),
    staleTime: 30 * 1000,
  });

  // Data query: keyed by filters + page + sort — fast (<1ms) because no COUNT(*) OVER()
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['endpoints-data', page, pageSize, sorting, ...filterKey],
    queryFn: () =>
      fetchEndpoints({
        ...filterParams,
        page,
        page_size: pageSize,
        sort_by: sorting[0]?.id,
        sort_dir: sorting[0]?.desc ? 'desc' : 'asc',
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const totalEndpoints = summary?.totals?.all_endpoints ?? 0;
  const availableCount = summary?.response_tally?.http_200 ?? 0;
  const unavailableCount = totalEndpoints - availableCount;

  const hasActiveFilters = filters.fhirVersions.length > 0 || highUptimeOnly || !!search || !!vendor || !!filters.source;

  const clearAllFilters = () => {
    setFhirVersions([]);
    setHighUptimeOnly(false);
    setSearch('');
    setVendor(null);
    setSource(null);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        subtitle="Browse and search all monitored FHIR endpoints"
        breadcrumbs={[{ label: 'Endpoints' }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Available" value={availableCount} borderColor="#2e8540" icon={<CheckCircle size={18} />} />
        <KpiCard label="Down" value={unavailableCount} borderColor="#e31c3d" icon={<XCircle size={18} />} />
        <KpiCard label="Avg Response" value="342ms" borderColor="#205493" icon={<Clock size={18} />} />
        <KpiCard label="Network Uptime" value="97.4%" borderColor="#02bfe7" icon={<Activity size={18} />} />
      </div>

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter endpoints"
      >
        {/* Search row */}
        <div className="mb-4 flex flex-wrap gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by endpoint name, URL, or organization..."
            className="flex-1 min-w-[280px]"
          />
          <DownloadButton
            url={getEndpointsCsvUrl({
              fhir_versions: filters.fhirVersions.length > 0 ? filters.fhirVersions : undefined,
              availability: highUptimeOnly ? '99-100' : undefined,
              vendor: vendor || undefined,
            })}
            label="Export CSV"
          />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              FHIR Version
            </label>
            <Select
              value={filters.fhirVersions[0] ?? '__all__'}
              onValueChange={(v) => { setFhirVersions(v === '__all__' ? [] : [v]); setPage(1); }}
              options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersionOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Versions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              EHR Developer
            </label>
            <Select
              value={vendor ?? '__all__'}
              onValueChange={(v) => { setVendor(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendorOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Source
            </label>
            <Select
              value={filters.source ?? '__all__'}
              onValueChange={(v) => { setSource(v === '__all__' ? null : v); setPage(1); }}
              options={[
                { value: '__all__', label: 'All Sources' },
                { value: 'CHPL', label: 'CHPL' },
                { value: 'State Medicaid', label: 'State Medicaid' },
                { value: 'Payer', label: 'Payer' },
                { value: 'Other', label: 'Other' },
              ]}
              placeholder="All Sources"
            />
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <QuickFilter
            label="≥99% Uptime"
            active={highUptimeOnly}
            onClick={() => { setHighUptimeOnly((v) => !v); setPage(1); }}
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div
            className="mt-4 flex justify-end"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
          >
            <button
              onClick={clearAllFilters}
              className="text-sm font-semibold text-neutral-500 hover:text-navy-700 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {/* Results bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-semibold text-neutral-700">
            {totalCount.toLocaleString()}
          </span>{' '}
          results
        </p>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Table or Grid */}
      {viewMode === 'table' ? (
        <DataTable
          data={data}
          columns={columns}
          totalCount={totalCount}
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
            data.map((ep) => (
              <div
                key={ep.url}
                className="rounded-md border border-neutral-200 bg-white p-4 shadow-card"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="truncate block w-full text-left font-semibold text-navy-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-1 rounded-sm"
                      onClick={() => setSelectedEndpointUrl(ep.url)}
                    >
                      {ep.endpoint_names || ep.url}
                    </button>
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

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
      />
    </div>
  );
}
