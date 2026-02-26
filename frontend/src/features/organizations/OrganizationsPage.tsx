import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchOrganizations } from '@/api/organizations';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { getOrganizationsCsvUrl } from '@/api/downloads';
import type { Organization } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Organization, unknown>[] = [
  {
    accessorKey: 'organization_name',
    header: 'Organization',
    size: 250,
    cell: ({ getValue }) => (
      <span className="font-semibold text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Location',
    cell: ({ getValue }) => (getValue() as string) || '—',
  },
  {
    accessorKey: 'identifier_value',
    header: 'NPI',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? (
        <span className="font-mono text-sm">{val}</span>
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
    accessorKey: 'vendor_name',
    header: 'Developer',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <Badge variant="navy">{vendor}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
];

export default function OrganizationsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['organizations', page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      fetchOrganizations({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor ?? undefined,
        search: debouncedSearch || undefined,
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Healthcare organizations with registered FHIR endpoints"
        breadcrumbs={[{ label: 'Organizations' }]}
      />

      {/* Search + Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search organizations by name, NPI, or location..."
          className="sm:max-w-md"
        />
        <DownloadButton url={getOrganizationsCsvUrl()} label="Export CSV" />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-semibold text-neutral-700">
            {(data?.pagination.total_count ?? 0).toLocaleString()}
          </span>{' '}
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
