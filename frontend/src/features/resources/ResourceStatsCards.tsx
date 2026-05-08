import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/ui/KpiCard';
import { fetchResourceStats } from '@/api/resources';

export function ResourceStatsCards() {
  const { data } = useQuery({
    queryKey: ['resource-stats'],
    queryFn: fetchResourceStats,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Distinct Resources"
        value={data.distinct_resources}
        subtitle="Unique FHIR resource types observed"
        borderColor="var(--color-success, #2e8540)"
      />
      <KpiCard
        label="Avg Resources / Endpoint"
        value={data.avg_per_endpoint}
        subtitle="Mean count across all endpoints"
        borderColor="var(--color-secondary, #02bfe7)"
      />
      <KpiCard
        label="Most Supported"
        value={data.most_supported_resource}
        subtitle={`Supported by ${data.most_supported_percent.toFixed(1)}% of endpoints`}
        borderColor="var(--color-primary, #0f2f8a)"
        smallValue
      />
      <KpiCard
        label="USCDI Coverage"
        value={`${data.uscdi_coverage_percent.toFixed(1)}%`}
        subtitle="Of endpoints support all USCDI v1 resources"
        borderColor="var(--color-warning, #fdb81e)"
      />
    </div>
  );
}
