import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/ui/KpiCard';
import { fetchIGStats } from '@/api/implementation';
import { formatNumber } from '@/lib/formatters';

export function IGStatsCards() {
  const { data } = useQuery({
    queryKey: ['ig-stats'],
    queryFn: fetchIGStats,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <div className="kpi-strip">
      <KpiCard
        label="Total IGs Reported"
        value={data.distinct_igs}
        subtitle="Distinct implementation guides"
        borderColor="var(--color-secondary, #02bfe7)"
      />
      <KpiCard
        label="Most Adopted"
        value={data.most_adopted_name}
        subtitle={`Referenced by ${formatNumber(data.most_adopted_count)} endpoints`}
        borderColor="var(--color-success, #2e8540)"
        smallValue
      />
      <KpiCard
        label="Endpoints w/ IGs"
        value={data.endpoints_with_igs}
        subtitle={`${data.endpoints_with_igs_pct}% declare at least one IG`}
        borderColor="var(--color-primary)"
      />
      <KpiCard
        label="Avg IGs / Endpoint"
        value={data.avg_igs_per_endpoint}
        subtitle="Mean implementation guides referenced"
        borderColor="var(--color-warning, #f7c951)"
      />
    </div>
  );
}
