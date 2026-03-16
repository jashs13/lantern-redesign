import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { fetchResources } from '@/api/resources';
import { fetchFHIRVersions, fetchVendors, fetchFilterResources, fetchFilterOperations } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { CheckboxScrollList } from '@/components/ui/CheckboxScrollList';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import type { Resource } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Resource, unknown>[] = [
  {
    accessorKey: 'resource_type',
    header: 'Resource Type',
    cell: ({ getValue }) => (
      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
        {(getValue() as string) || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'fhir_versions',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const versions = getValue() as string[] | null;
      if (!versions || versions.length === 0) return <span style={{ color: 'var(--color-gray-light)' }}>—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {versions.map((ver) => (
            <Badge key={ver} variant={ver.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>
              {ver}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'endpoint_count',
    header: 'Endpoint Count',
    cell: ({ getValue }) => (
      <span className="font-semibold" style={{ color: 'var(--color-gray-dark)' }}>
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

export default function ResourcesPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();

  const [fhirVersions, setFhirVersions] = useState<string[]>(filters.fhirVersions ?? []);
  const [vendor, setVendor] = useState<string | null>(null);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [resourcesInitialized, setResourcesInitialized] = useState(false);

  // Filter option queries
  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data: resourceOptions = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['filters', 'resources'],
    queryFn: fetchFilterResources,
  });

  // Select all resources by default on first load
  useEffect(() => {
    if (resourceOptions.length > 0 && !resourcesInitialized) {
      setSelectedResources(resourceOptions.map((o) => o.value));
      setResourcesInitialized(true);
    }
  }, [resourceOptions, resourcesInitialized]);

  const { data: operationOptions = [] } = useQuery({
    queryKey: ['filters', 'operations'],
    queryFn: fetchFilterOperations,
  });

  // Main data query — only run when at least one resource is selected.
  // apiClient silently drops empty arrays, so we must gate here instead of passing [].
  const shouldFetch = resourcesInitialized && selectedResources.length > 0;

  const { data: queryData, isLoading, error, refetch } = useQuery({
    queryKey: ['resources', page, pageSize, fhirVersions, vendor, selectedResources, selectedOperations],
    queryFn: () =>
      fetchResources({
        page,
        page_size: pageSize,
        fhir_versions: fhirVersions.length > 0 ? fhirVersions : undefined,
        vendor: vendor ?? undefined,
        resources: selectedResources,
        operations: selectedOperations.length > 0 ? selectedOperations : undefined,
      }),
    enabled: shouldFetch,
  });

  // When nothing is selected, treat as empty regardless of any cached data
  const data = shouldFetch ? queryData : undefined;

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  function handleFhirVersionChange(v: string[]) {
    setFhirVersions(v);
    setPage(1);
  }

  function handleResourcesChange(v: string[]) {
    setSelectedResources(v);
    setPage(1);
  }

  function handleOperationsChange(v: string[]) {
    setSelectedOperations(v);
    setPage(1);
  }

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const totalCount = data?.pagination.total_count ?? 0;

  // Active filter tags — only show resource tags when a subset is selected (not when all are selected)
  const allResourcesSelected = selectedResources.length === resourceOptions.length && resourceOptions.length > 0;
  const resourceFilters = [
    ...(!allResourcesSelected
      ? selectedResources.map((r) => ({
          key: `resource-${r}`,
          label: 'Resource',
          value: r,
          onRemove: () => handleResourcesChange(selectedResources.filter((v) => v !== r)),
        }))
      : []),
    ...selectedOperations.map((op) => ({
      key: `op-${op}`,
      label: 'Operation',
      value: op,
      onRemove: () => handleOperationsChange(selectedOperations.filter((v) => v !== op)),
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="FHIR Resources"
        subtitle={`Browse ${totalCount.toLocaleString()} resource type records across FHIR endpoints`}
        breadcrumbs={[{ label: 'Resources' }]}
      />

      {/* Top Filters card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Top filters"
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
              placeholder="FHIR Versions"
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

      {/* FHIR Resource Types card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Resource type filters"
      >
        <h2
          className="mb-4 font-sans font-bold uppercase"
          style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
        >
          FHIR Resource Types
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              Resources
            </label>
            <CheckboxScrollList
              options={resourceOptions.map((o) => o.value)}
              selected={selectedResources}
              onChange={handleResourcesChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              Operations
            </label>
            <MultiSelectDropdown
              options={operationOptions.map((o) => o.value)}
              selected={selectedOperations}
              onChange={handleOperationsChange}
              placeholder="Operations"
            />
            {selectedOperations.length > 0 && (
              <p
                className="font-sans"
                style={{ fontSize: '0.8125rem', color: 'var(--color-gray)', fontStyle: 'italic' }}
              >
                Only resources implementing all selected operations are shown.
              </p>
            )}
          </div>
        </div>

        {resourceFilters.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
            aria-live="polite"
          >
            {resourceFilters.map((f) => (
              <FilterTag key={f.key} label={f.label} value={f.value} onRemove={f.onRemove} />
            ))}
          </div>
        )}
      </section>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-sans" style={{ fontSize: '0.9375rem', color: 'var(--color-gray)' }}>
          Showing{' '}
          <strong style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>
            {formatNumber(totalCount)}
          </strong>{' '}
          resource records
        </p>
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={resourcesLoading || isLoading}
      />
    </div>
  );
}
