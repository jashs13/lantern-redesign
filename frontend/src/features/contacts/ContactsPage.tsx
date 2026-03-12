import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchContacts } from '@/api/contacts';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EndpointDetailModal } from '@/features/endpoints/EndpointDetailModal';
import type { Contact } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

function buildColumns(
  onOpenDetail: (url: string) => void
): ColumnDef<Contact, unknown>[] {
  return [
  {
    accessorKey: 'url',
    header: 'Endpoint URL',
    size: 250,
    cell: ({ getValue }) => {
      const url = getValue() as string;
      return (
        <div className="min-w-0 max-w-[300px]">
          <button
            type="button"
            className="truncate block w-full font-mono text-xs text-navy-700 hover:underline text-left"
            onClick={() => onOpenDetail(url)}
          >
            {url || '—'}
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: 'vendor_name',
    header: 'Developer',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <Badge variant="navy" className="whitespace-nowrap">{vendor}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
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
    accessorKey: 'contact_name',
    header: 'Contact Name',
    cell: ({ getValue }) => (
      <span className="font-medium text-neutral-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'contact_type',
    header: 'Contact Type',
    cell: ({ getValue }) => {
      const type = getValue() as string | null;
      return type ? (
        <Badge variant="default">{type}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'contact_value',
    header: 'Contact Value',
    cell: ({ getValue }) => (
      <span className="text-sm text-neutral-600">{(getValue() as string) || '—'}</span>
    ),
  },
];
}

const ALL = '__all__';

export default function ContactsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const [fhirVersion, setFhirVersion] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [hasContact, setHasContact] = useState<'any' | 'true' | 'false'>('any');
  const debouncedSearch = useDebounce(search);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const columns = buildColumns((url) => setSelectedEndpointUrl(url));

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contacts', page, pageSize, filters, debouncedSearch, fhirVersion, vendor, hasContact],
    queryFn: () =>
      fetchContacts({
        page,
        page_size: pageSize,
        fhir_versions: fhirVersion ? [fhirVersion] : filters.fhirVersions,
        vendor: vendor ?? undefined,
        has_contact: hasContact !== 'any' ? hasContact : undefined,
        search: debouncedSearch || undefined,
      }),
  });

  function handleFhirVersionChange(v: string) {
    setFhirVersion(v === ALL ? null : v);
    setPage(1);
  }

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  function handleHasContactChange(v: string) {
    setHasContact(v === ALL ? 'any' : (v as 'true' | 'false'));
    setPage(1);
  }

  const activeFilters = [
    fhirVersion && { key: 'fhirVersion', label: 'FHIR Version', value: fhirVersion, onRemove: () => { setFhirVersion(null); setPage(1); } },
    vendor && { key: 'vendor', label: 'EHR Developer', value: vendor, onRemove: () => { setVendor(null); setPage(1); } },
    hasContact !== 'any' && { key: 'hasContact', label: 'Has Contact Data', value: hasContact === 'true' ? 'True' : 'False', onRemove: () => { setHasContact('any'); setPage(1); } },
  ].filter(Boolean) as { key: string; label: string; value: string; onRemove: () => void }[];

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        subtitle="Contact information for FHIR endpoint operators"
        breadcrumbs={[{ label: 'Contacts' }]}
      />

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter contacts"
      >
        {/* Search row */}
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search contacts..."
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

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Has Contact Data
            </label>
            <Select
              value={hasContact === 'any' ? ALL : hasContact}
              onValueChange={handleHasContactChange}
              options={[
                { value: ALL, label: 'Any' },
                { value: 'true', label: 'True' },
                { value: 'false', label: 'False' },
              ]}
              placeholder="Any"
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

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        totalCount={data?.pagination.total_count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
      />
    </div>
  );
}
