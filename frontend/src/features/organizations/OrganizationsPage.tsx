import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchOrganizations } from '@/api/organizations';
import { fetchVendors, fetchStates, fetchFHIRVersions } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { getOrganizationsCsvUrl } from '@/api/downloads';
import type { Organization } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Organization, unknown>[] = [
  {
    accessorKey: 'organization_name',
    header: 'Organization Name',
    size: 250,
    cell: ({ getValue }) => (
      <span
        className="font-semibold"
        style={{ color: 'var(--color-primary)', fontWeight: 600 }}
      >
        {(getValue() as string) || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Location',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <span
          style={{ color: 'var(--color-gray-dark)' }}
          dangerouslySetInnerHTML={{ __html: val }}
        />
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'identifier_value',
    header: 'NPI',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <span
          className="font-mono"
          style={{ fontSize: '0.875rem', color: 'var(--color-gray)' }}
          dangerouslySetInnerHTML={{ __html: val }}
        />
      ) : (
        <span style={{ color: 'var(--color-gray-light)' }}>—</span>
      );
    },
  },
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      if (!ver) return <span style={{ color: 'var(--color-gray-light)' }}>—</span>;
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.5rem',
            background: 'var(--color-gray-lightest)',
            color: 'var(--color-gray-dark)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
          dangerouslySetInnerHTML={{ __html: ver }}
        />
      );
    },
  },
  {
    accessorKey: 'vendor_name',
    header: 'EHR Developer',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.5rem',
            background: 'var(--color-gray-lightest)',
            color: 'var(--color-gray-dark)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
          dangerouslySetInnerHTML={{ __html: vendor }}
        />
      ) : (
        <span style={{ color: 'var(--color-gray-light)' }}>—</span>
      );
    },
  },
];

export default function OrganizationsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<string | null>(null);
  const [fhirVersion, setFhirVersion] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data: stateOptions = [] } = useQuery({
    queryKey: ['filters', 'states'],
    queryFn: fetchStates,
  });

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['organizations', page, pageSize, filters, debouncedSearch, state, fhirVersion, vendor],
    queryFn: () =>
      fetchOrganizations({
        page,
        page_size: pageSize,
        fhir_versions: fhirVersion ? [fhirVersion] : filters.fhirVersions,
        vendor: vendor ?? undefined,
        search: debouncedSearch || undefined,
        state: state ?? undefined,
      }),
  });

  const ALL = '__all__';

  function handleStateChange(v: string) {
    setState(v === ALL ? null : v);
    setPage(1);
  }

  function handleFhirVersionChange(v: string) {
    setFhirVersion(v === ALL ? null : v);
    setPage(1);
  }

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const activeFilters = [
    state && { key: 'state', label: 'State', value: state, onRemove: () => { setState(null); setPage(1); } },
    fhirVersion && { key: 'fhirVersion', label: 'FHIR Version', value: fhirVersion, onRemove: () => { setFhirVersion(null); setPage(1); } },
    vendor && { key: 'vendor', label: 'Developer', value: vendor, onRemove: () => { setVendor(null); setPage(1); } },
  ].filter(Boolean) as { key: string; label: string; value: string; onRemove: () => void }[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Healthcare Organizations"
        subtitle={`Browse ${(data?.pagination.total_count ?? 0).toLocaleString()} organizations with FHIR endpoints across the United States`}
        breadcrumbs={[{ label: 'Organizations' }]}
      />

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter organizations"
      >
        {/* Search row */}
        <div className="mb-4 flex flex-wrap gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name, NPI, city, or address..."
            className="flex-1 min-w-[280px]"
          />
          <DownloadButton url={getOrganizationsCsvUrl()} label="Export to CSV" />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              State / Region
            </label>
            <Select
              value={state ?? ALL}
              onValueChange={handleStateChange}
              options={[{ value: ALL, label: 'All States' }, ...stateOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All States"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              FHIR Version
            </label>
            <Select
              value={fhirVersion ?? ALL}
              onValueChange={handleFhirVersionChange}
              options={[{ value: ALL, label: 'All Versions' }, ...fhirVersionOptions.map((o) => ({ value: o.value, label: o.value }))]}
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
              value={vendor ?? ALL}
              onValueChange={handleVendorChange}
              options={[{ value: ALL, label: 'All Developers' }, ...vendorOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>
        </div>

        {/* Active filter tags */}
        {activeFilters.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
            aria-live="polite"
          >
            {activeFilters.map((f) => (
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
            {(data?.pagination.total_count ?? 0).toLocaleString()}
          </strong>{' '}
          organizations
        </p>
      </div>

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
