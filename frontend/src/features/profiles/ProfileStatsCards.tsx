import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/ui/KpiCard';
import { fetchProfileStats } from '@/api/profiles';

export function ProfileStatsCards() {
  const { data } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: fetchProfileStats,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Distinct Profiles"
        value={data.distinct_profiles}
        subtitle="Unique profile URLs declared"
        borderColor="var(--color-secondary, #02bfe7)"
      />
      <KpiCard
        label="US Core Profiles"
        value={data.us_core_profiles}
        subtitle="Official US Core profile declarations"
        borderColor="var(--color-success, #2e8540)"
      />
      <KpiCard
        label="Endpoints w/ Profiles"
        value={data.endpoints_with_profiles}
        subtitle="Declare at least one profile"
        borderColor="var(--color-primary, #205493)"
      />
      <KpiCard
        label="Avg Profiles / Endpoint"
        value={data.avg_profiles_per_endpoint}
        subtitle="Mean profile count per endpoint"
        borderColor="var(--color-warning, #fdb81e)"
      />
    </div>
  );
}
