import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { usePrefetchNextPage } from '@/hooks/usePrefetchNextPage';
import { fetchFieldValues } from '@/api/fields';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import type { FieldValue } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<FieldValue, unknown>[] = [
  {
    accessorKey: 'field_name',
    header: 'Field Name',
    cell: ({ getValue }) => (
      <span className="font-semibold text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'field_value',
    header: 'Field Value',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm text-neutral-700">{(getValue() as string) || '—'}</span>
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

export default function FieldValuesPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const fieldParams = {
    fhir_versions: filters.fhirVersions,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['field-values', page, pageSize, filters.fhirVersions, debouncedSearch],
    queryFn: () => fetchFieldValues({ ...fieldParams, page, page_size: pageSize }),
  });

  const nextPageFn = useCallback(
    () => fetchFieldValues({ ...fieldParams, page: page + 1, page_size: pageSize }),
    [fieldParams, page, pageSize],
  );

  usePrefetchNextPage({
    page,
    pageSize,
    totalCount: data?.pagination.total_count ?? 0,
    queryKey: ['field-values', page + 1, pageSize, filters.fhirVersions, debouncedSearch],
    queryFn: nextPageFn,
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Values"
        subtitle="Distinct values reported for FHIR capability statement fields"
        breadcrumbs={[
          { label: 'Fields', href: '/fields' },
          { label: 'Values' },
        ]}
      />

      <div className="sm:max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search field values..." />
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
