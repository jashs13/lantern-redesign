import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchValidationsDetails } from '@/api/validations';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatNumber } from '@/lib/formatters';

export default function ValidationsPage() {
  const { filters } = useFilters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validations-details', filters.fhirVersions],
    queryFn: () =>
      fetchValidationsDetails({
        fhir_versions: filters.fhirVersions,
      }),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validations"
        subtitle="Validation rule results across FHIR endpoints"
        breadcrumbs={[{ label: 'Validations' }]}
      />

      <div className="overflow-x-auto rounded-md border border-neutral-200">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-900 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                FHIR Version
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                Valid
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                Invalid
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
                <td className="px-4 py-2.5 font-semibold text-navy-700">{row.rule_name}</td>
                <td className="px-4 py-2.5 text-neutral-500">{row.description ?? '—'}</td>
                <td className="px-4 py-2.5 text-neutral-700">{row.fhir_version}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-status-green">
                  {formatNumber(row.valid)}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-status-red">
                  {formatNumber(row.invalid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
