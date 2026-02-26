import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchResources } from '@/api/resources';
import { usePagination } from '@/hooks/usePagination';
import { DataTable } from '@/components/ui/DataTable';
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
    accessorKey: 'endpoint_count',
    header: 'Endpoint Count',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-700">
        {formatNumber(getValue() as number)}
      </span>
    ),
  },
];

export default function ResourcesPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resources', filters.fhirVersions],
    queryFn: () =>
      fetchResources({
        fhir_versions: filters.fhirVersions,
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        subtitle="FHIR resource types and their availability across endpoints"
        breadcrumbs={[{ label: 'Resources' }]}
      />

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
