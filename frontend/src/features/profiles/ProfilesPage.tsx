import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchProfiles } from '@/api/profiles';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Profile, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'Endpoint URL',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'profile_name',
    header: 'Profile Name',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'profile_url',
    header: 'Profile URL',
    cell: ({ getValue }) => {
      const url = getValue() as string | null;
      return url ? (
        <span className="font-mono text-xs text-neutral-500">{url}</span>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'resource',
    header: 'Resource',
    cell: ({ getValue }) => {
      const resource = getValue() as string | null;
      return resource ? (
        <Badge variant="info">{resource}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
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
];

export default function ProfilesPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles', page, pageSize, filters.fhirVersions, debouncedSearch],
    queryFn: () =>
      fetchProfiles({
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
        title="Profiles"
        subtitle="FHIR profiles declared by endpoint capability statements"
        breadcrumbs={[{ label: 'Profiles' }]}
      />

      <div className="sm:max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search profiles..." />
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
