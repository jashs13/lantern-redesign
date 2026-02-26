import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchFields } from '@/api/fields';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import type { Field } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Field, unknown>[] = [
  {
    accessorKey: 'field_name',
    header: 'Field Name',
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
  {
    accessorKey: 'is_required',
    header: 'Required',
    cell: ({ getValue }) =>
      getValue() ? (
        <Badge variant="info">Required</Badge>
      ) : (
        <Badge variant="default">Optional</Badge>
      ),
  },
];

export default function FieldsPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fields', page, pageSize, filters.fhirVersions, debouncedSearch],
    queryFn: () =>
      fetchFields({
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
        title="Fields"
        subtitle="FHIR capability statement fields and their usage across endpoints"
        breadcrumbs={[{ label: 'Fields' }]}
      />

      <div className="sm:max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search fields..." />
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
