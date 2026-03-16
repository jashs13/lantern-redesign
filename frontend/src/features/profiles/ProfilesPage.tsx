import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchProfileAdoption, fetchProfilesChart } from '@/api/profiles';
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { ProfileStatsCards } from './ProfileStatsCards';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { fetchFHIRVersions, fetchVendors, fetchFilterResources } from '@/api/filters';
import type { ProfileAdoptionItem } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

function getProfileSource(url: string): { label: string; variant: string } {
  if (url.includes('hl7.org/fhir/us/core')) return { label: 'US Core', variant: 'info' };
  if (url.includes('hl7.org/fhir/us/carin-bb')) return { label: 'CARIN', variant: 'warning' };
  if (url.includes('hl7.org/fhir/us/davinci')) return { label: 'DaVinci', variant: 'success' };
  if (url.includes('hl7.org/fhir/StructureDefinition') || url.includes('hl7.org/fhir/R4'))
    return { label: 'Base FHIR', variant: 'navy' };
  return { label: 'Custom', variant: 'default' };
}

const columns: ColumnDef<ProfileAdoptionItem, unknown>[] = [
  {
    accessorKey: 'profile_url',
    header: 'URL',
    cell: ({ getValue }) => {
      const url = getValue() as string;
      return (
        <span className="font-mono text-xs text-neutral-500" style={{ wordBreak: 'break-all' }}>
          {url || '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'profile_url',
    id: 'source',
    header: 'Source',
    cell: ({ getValue }) => {
      const { label, variant } = getProfileSource(getValue() as string);
      return <Badge variant={variant as any}>{label}</Badge>;
    },
  },
  {
    accessorKey: 'endpoint_count',
    header: 'Endpoints',
    cell: ({ getValue }) => (
      <span className="font-bold text-navy-700">
        {(getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'adoption_pct',
    header: 'Adoption',
    cell: ({ getValue }) => {
      const pct = getValue() as number;
      const color =
        pct >= 75
          ? 'var(--color-success, #2e8540)'
          : pct >= 25
          ? 'var(--color-secondary, #02bfe7)'
          : 'var(--color-warning, #fdb81e)';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 130 }}>
          <div
            style={{
              flex: 1,
              height: 8,
              background: 'var(--color-gray-lighter, #d6d7d9)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 48, textAlign: 'right' }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      );
    },
  },
];

export default function ProfilesPage({ asTab = false }: { asTab?: boolean } = {}) {
  const { filters, setFhirVersions, setVendor } = useFilters();
  const { page, setPage, pageSize } = usePagination(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const [resource, setResource] = useState<string | null>(null);

  const { data: fhirVersions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['filters', 'resources'],
    queryFn: fetchFilterResources,
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles-adoption', page, pageSize, filters.fhirVersions, filters.vendor, resource, debouncedSearch],
    queryFn: () =>
      fetchProfileAdoption({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        resource: resource || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: chartRaw, isLoading: isChartLoading } = useQuery({
    queryKey: ['profiles-chart'],
    queryFn: fetchProfilesChart,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!chartRaw) return [];
    return chartRaw.slice(0, 5).map((item) => ({
      name: item.name,
      value: item.endpoint_count,
    }));
  }, [chartRaw]);

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {!asTab && (
        <PageHeader
          title="Profiles"
          subtitle="FHIR profiles declared by endpoint capability statements"
          breadcrumbs={[{ label: 'Profiles' }]}
        />
      )}

      <ProfileStatsCards />

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter profiles"
      >
        {/* Search row */}
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by profile name, URL, or resource..."
            className="max-w-md"
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
              options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersions.map(o => ({ value: o.value, label: o.value }))]}
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
              value={filters.vendor ?? '__all__'}
              onValueChange={(v) => { setVendor(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendors.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Resource
            </label>
            <Select
              value={resource ?? '__all__'}
              onValueChange={(v) => { setResource(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Resources' }, ...resources.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Resources"
            />
          </div>
        </div>
      </section>

      {/* Profile adoption chart */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Profile adoption chart"
      >
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            Profile Adoption
          </span>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
            Top 5 profiles by number of distinct endpoints declaring them
          </p>
        </div>
        {isChartLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray)', fontSize: '0.875rem' }}>
            Loading chart…
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray)', fontSize: '0.875rem' }}>
            No data available.
          </div>
        ) : (
          <HorizontalBarChart data={chartData} />
        )}
      </section>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        totalCount={data?.pagination.total_count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
