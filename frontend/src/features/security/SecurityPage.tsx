import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchSecurity } from '@/api/security';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import type { SecurityEndpoint } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<SecurityEndpoint, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'URL',
    size: 300,
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
    accessorKey: 'security_code',
    header: 'Security Code',
    cell: ({ getValue }) => {
      const code = getValue() as string | null;
      return code ? (
        <span className="inline-flex items-center rounded bg-status-green-bg px-2 py-0.5 text-xs font-medium text-status-green">
          {code}
        </span>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'security_system',
    header: 'Security System',
    cell: ({ getValue }) => (
      <span className="text-sm text-neutral-600">{(getValue() as string) || '—'}</span>
    ),
  },
];

export default function SecurityPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['security', page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      fetchSecurity({
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
        title="Security Analysis"
        subtitle="Security configurations and authentication methods across FHIR endpoints"
        breadcrumbs={[{ label: 'Security' }]}
      />

      <div className="sm:max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search security endpoints..."
        />
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
