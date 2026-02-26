import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchCapStatSizes } from '@/api/implementation';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';

export default function CapStatSizePage() {
  const { filters } = useFilters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['capstat-sizes', filters.fhirVersions],
    queryFn: () =>
      fetchCapStatSizes({
        fhir_versions: filters.fhirVersions,
      }),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capability Statement Sizes"
        subtitle="Size statistics for FHIR capability statements by vendor"
        breadcrumbs={[{ label: 'CapStat Sizes' }]}
      />

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
            {data.map((row, i) => (
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
    </div>
  );
}
