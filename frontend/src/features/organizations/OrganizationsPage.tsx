import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchOrganizations, fetchOrganizationsCount } from '@/api/organizations';
import { fetchVendors, fetchStates, fetchFHIRVersions } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EndpointDetailModal } from '@/features/endpoints/EndpointDetailModal';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { getOrganizationsCsvUrl } from '@/api/downloads';
import type { Organization } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

function parseAddresses(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split('<br/>').map((s) => s.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
}

// Clicking the Organization Name opens the EndpointDetailModal for the associated
// endpoint_url field. Since endpoint_url may contain multiple <br/>-separated URLs,
// we extract and use the first one.
function buildColumns(
  onShowLocations: (addresses: string[], orgName: string) => void,
  onOpenDetail: (url: string) => void
): ColumnDef<Organization, unknown>[] {
  return [
    {
      accessorKey: 'organization_name',
      header: 'Organization Name',
      size: 250,
      cell: ({ getValue, row }) => {
        const name = (getValue() as string) || '—';
        const endpointUrl = row.original.endpoint_url;
        const firstUrl = endpointUrl
          ? endpointUrl.split('<br/>')[0].replace(/<[^>]*>/g, '').trim()
          : null;
        return firstUrl ? (
          <button
            type="button"
            className="font-semibold text-left hover:underline"
            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
            onClick={() => onOpenDetail(firstUrl)}
          >
            {name}
          </button>
        ) : (
          <span
            className="font-semibold"
            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
          >
            {name}
          </span>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ getValue, row }) => {
        const val = getValue() as string | null;
        const addresses = parseAddresses(val);
        if (addresses.length === 0) return '—';
        const visible = addresses.slice(0, 2);
        return (
          <div className="min-w-0">
            <p className="text-sm text-neutral-600">{visible.join('; ')}</p>
            {addresses.length > 2 && (
              <button
                className="mt-0.5 text-xs font-semibold text-navy-700 hover:underline"
                onClick={() => onShowLocations(addresses, row.original.organization_name)}
              >
                Show all
              </button>
            )}
          </div>
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
        const plain = ver.replace(/<[^>]*>/g, '').trim();
        return <Badge variant={plain.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>{plain}</Badge>;
      },
    },
    {
      accessorKey: 'vendor_name',
      header: 'EHR Developer',
      cell: ({ getValue }) => {
        const vendor = getValue() as string | null;
        if (!vendor) return <span style={{ color: 'var(--color-gray-light)' }}>—</span>;
        const plain = vendor.replace(/<[^>]*>/g, '').trim();
        return <Badge variant="navy" className="whitespace-nowrap">{plain}</Badge>;
      },
    },
  ];
}

export default function OrganizationsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [state, setState] = useState<string | null>(searchParams.get('state') || null);
  const [fhirVersion, setFhirVersion] = useState<string | null>(searchParams.get('fhir_version') || null);
  const [vendor, setVendor] = useState<string | null>(searchParams.get('vendor') || null);
  const debouncedSearch = useDebounce(search);

  const [locationModal, setLocationModal] = useState<{ addresses: string[]; orgName: string } | null>(null);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const columns = buildColumns(
    (addresses, orgName) => setLocationModal({ addresses, orgName }),
    (url) => setSelectedEndpointUrl(url)
  );

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

  const filterParams = {
    fhir_versions: fhirVersion ? [fhirVersion] : filters.fhirVersions,
    vendor: vendor ?? undefined,
    search: debouncedSearch || undefined,
    state: state ?? undefined,
  };

  const filterKey = [filters, debouncedSearch, state, fhirVersion, vendor];

  // Count query — keyed by filters only, cached across page changes
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['organizations-count', ...filterKey],
    queryFn: () => fetchOrganizationsCount(filterParams),
    staleTime: 30 * 1000,
  });

  // Data query — includes page, fast index scan
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['organizations-data', page, pageSize, ...filterKey],
    queryFn: () => fetchOrganizations({ ...filterParams, page, page_size: pageSize }),
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
        subtitle={`Browse ${totalCount.toLocaleString()} organizations with FHIR endpoints across the United States`}
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
          <DownloadButton
            url={getOrganizationsCsvUrl({
              developer: vendor || undefined,
              fhir_version: fhirVersion ? [fhirVersion] : (filters.fhirVersions.length > 0 ? filters.fhirVersions : undefined),
              state: state || undefined,
              search: debouncedSearch || undefined,
            })}
            label="Export to CSV"
          />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            {totalCount.toLocaleString()}
          </strong>{' '}
          organizations
        </p>
      </div>

      <DataTable
        data={data}
        columns={columns}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Location Modal */}
      {locationModal && (
        <Modal
          open={!!locationModal}
          onOpenChange={(open) => { if (!open) setLocationModal(null); }}
          title="All Locations"
          maxWidth="max-w-lg"
        >
          <p className="mb-3 text-sm font-semibold text-neutral-700">{locationModal.orgName}</p>
          <ul className="space-y-1">
            {locationModal.addresses.map((addr, i) => (
              <li key={i} className="border-b border-neutral-100 pb-1 text-sm text-neutral-800 last:border-0">
                {addr}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
      />
    </div>
  );
}
