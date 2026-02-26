import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchSmartResponse } from '@/api/smart';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatHttpStatus } from '@/lib/formatters';
import type { SmartEndpoint } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<SmartEndpoint, unknown>[] = [
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
    accessorKey: 'smart_http_response',
    header: 'SMART HTTP Response',
    cell: ({ getValue }) => {
      const status = getValue() as number | null;
      if (!status) return <span className="text-neutral-400">—</span>;
      const color =
        status >= 200 && status < 300
          ? 'text-status-green'
          : status >= 400
            ? 'text-status-red'
            : 'text-neutral-600';
      return (
        <span className={`font-mono font-semibold ${color}`}>{formatHttpStatus(status)}</span>
      );
    },
  },
];

export default function SmartResponsePage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['smart-response', page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      fetchSmartResponse({
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
        title="SMART Response"
        subtitle="SMART on FHIR capabilities and response data for endpoints"
        breadcrumbs={[{ label: 'SMART Response' }]}
      />

      <div className="sm:max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search SMART endpoints..."
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
