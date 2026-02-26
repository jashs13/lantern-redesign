import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchContacts } from '@/api/contacts';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import type { Contact } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Contact, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'Endpoint URL',
    size: 250,
    cell: ({ getValue }) => (
      <span className="font-mono text-sm text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'vendor_name',
    header: 'Vendor',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <Badge variant="navy">{vendor}</Badge>
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

export default function ContactsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contacts', page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      fetchContacts({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        search: debouncedSearch || undefined,
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle="Contact information for FHIR endpoint operators"
        breadcrumbs={[{ label: 'Contacts' }]}
      />

      <div className="sm:max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search contacts..." />
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
