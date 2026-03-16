import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { fetchImplementationGuides } from '@/api/implementation';
import { IGStatsCards } from './IGStatsCards';
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import type { ImplementationGuide } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<ImplementationGuide, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Implementation Guide',
    cell: ({ getValue }) => (
      <span className="font-semibold text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      if (!ver) return '—';
      return <Badge variant={ver.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>{ver}</Badge>;
    },
  },
  {
    accessorKey: 'count',
    header: 'Count',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-700">
        {formatNumber(getValue() as number)}
      </span>
    ),
  },
];

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--color-gray-dark)',
  letterSpacing: '0.03em',
  fontWeight: 700,
};

const ALL = '__all__';

export default function ImplementationGuidesTabContent({ asTab = false }: { asTab?: boolean } = {}) {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();

  const [fhirVersions, setFhirVersions] = useState<string[]>(filters.fhirVersions ?? []);
  const [vendor, setVendor] = useState<string | null>(null);

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['implementation-guides', page, pageSize, fhirVersions, vendor],
    queryFn: () =>
      fetchImplementationGuides({
        fhir_versions: fhirVersions.length > 0 ? fhirVersions : undefined,
        vendor: vendor ?? undefined,
        page,
        page_size: pageSize,
      }),
  });

  const { data: chartRaw, isLoading: isChartLoading } = useQuery({
    queryKey: ['implementation-guides-chart', fhirVersions, vendor],
    queryFn: () =>
      fetchImplementationGuides({
        fhir_versions: fhirVersions.length > 0 ? fhirVersions : undefined,
        vendor: vendor ?? undefined,
        page: 1,
        page_size: 5,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!chartRaw) return [];
    const TRUNCATE = 45;
    return chartRaw.data.map((ig: ImplementationGuide) => ({
      name: ig.name.length > TRUNCATE ? ig.name.slice(0, TRUNCATE) + '…' : ig.name,
      value: ig.count,
    }));
  }, [chartRaw]);

  function handleFhirVersionChange(v: string[]) {
    setFhirVersions(v);
    setPage(1);
  }

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <IGStatsCards />
      {!asTab && (
        <PageHeader
          title="Implementation Guides"
          subtitle="FHIR implementation guides referenced by endpoints"
          breadcrumbs={[{ label: 'Implementation Guides' }]}
        />
      )}

      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Filters"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              FHIR Version
            </label>
            <MultiSelectDropdown
              options={fhirVersionOptions.map((o) => o.value)}
              selected={fhirVersions}
              onChange={handleFhirVersionChange}
              placeholder="All FHIR Versions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              Developer
            </label>
            <Select
              value={vendor ?? ALL}
              onValueChange={handleVendorChange}
              options={[
                { value: ALL, label: 'All Developers' },
                ...vendorOptions.map((o) => ({ value: o.value, label: o.value })),
              ]}
              placeholder="All Developers"
            />
          </div>
        </div>

        {vendor && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
            aria-live="polite"
          >
            <FilterTag
              label="Developer"
              value={vendor}
              onRemove={() => { setVendor(null); setPage(1); }}
            />
          </div>
        )}
      </section>

      {/* IG adoption chart */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Implementation guide adoption chart"
      >
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            Implementation Guide Adoption
          </span>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
            Top 5 implementation guides by number of endpoints referencing them
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
