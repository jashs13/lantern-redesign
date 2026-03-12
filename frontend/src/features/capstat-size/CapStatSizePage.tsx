import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { fetchCapStatSizes } from '@/api/implementation';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--color-gray-dark)',
  letterSpacing: '0.03em',
  fontWeight: 700,
};

const ALL = '__all__';

export default function CapStatSizePage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();

  const [fhirVersions, setFhirVersions] = useState<string[]>(filters.fhirVersions ?? []);
  const [vendor, setVendor] = useState<string | null>(null);

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['capstat-sizes', page, pageSize, fhirVersions, vendor],
    queryFn: () =>
      fetchCapStatSizes({
        fhir_versions: fhirVersions.length > 0 ? fhirVersions : undefined,
        vendor: vendor ?? undefined,
        page,
        page_size: pageSize,
      }),
  });

  function handleFhirVersionChange(v: string[]) {
    setFhirVersions(v);
    setPage(1);
  }

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const rows = data?.data ?? [];
  const totalCount = data?.pagination.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capability Statement Sizes"
        subtitle="Size statistics for FHIR capability statements by vendor"
        breadcrumbs={[{ label: 'CapStat Sizes' }]}
      />

      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Filters"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              FHIR Version
            </label>
            <MultiSelectDropdown
              options={fhirVersionOptions.map((o) => o.value)}
              selected={fhirVersions}
              onChange={handleFhirVersionChange}
              placeholder="FHIR Versions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              Developer
            </label>
            <Select
              value={vendor ?? ALL}
              onValueChange={handleVendorChange}
              options={[
                { value: ALL, label: 'All Developers' },
                ...vendorOptions.map((o) => ({ value: o.value, label: o.value })),
              ]}
              placeholder="All Developers"
            />
          </div>
        </div>

        {vendor && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
            aria-live="polite"
          >
            <FilterTag
              label="Developer"
              value={vendor}
              onRemove={() => { setVendor(null); setPage(1); }}
            />
          </div>
        )}
      </section>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-navy-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    FHIR Version
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Min
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Max
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Mean
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Std Dev
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-sky-500/5 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Badge variant="navy">{row.vendor_name}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={row.fhir_version?.startsWith('4.0') ? 'fhir-r4' : 'fhir'}
                      >
                        {row.fhir_version || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-700">
                      {row.min != null ? formatNumber(Math.round(row.min)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-700">
                      {row.max != null ? formatNumber(Math.round(row.max)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-700">
                      {row.mean != null ? formatNumber(Math.round(row.mean)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-700">
                      {row.std_dev != null ? formatNumber(Math.round(row.std_dev)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-neutral-700">
                      {formatNumber(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
