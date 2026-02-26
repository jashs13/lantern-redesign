import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { fetchImplementationGuides } from '@/api/implementation';
import { DataTable } from '@/components/ui/DataTable';
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

export default function ImplementationGuidesPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['implementation-guides', page, pageSize, filters.fhirVersions],
    queryFn: () =>
      fetchImplementationGuides({
        fhir_versions: filters.fhirVersions,
        page,
        page_size: pageSize,
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Implementation Guides"
        subtitle="FHIR implementation guides referenced by endpoints"
        breadcrumbs={[{ label: 'Implementation Guides' }]}
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
