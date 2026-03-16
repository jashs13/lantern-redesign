import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/ui/KpiCard';
import { fetchCapStatStats } from '@/api/implementation';
import { formatNumber } from '@/lib/formatters';

export function CapStatStatsCards() {
  const { data } = useQuery({
    queryKey: ['capstat-stats'],
    queryFn: fetchCapStatStats,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Avg Size"
        value={formatNumber(data.avg_size)}
        subtitle="Average capability statement size (bytes)"
        borderColor="var(--color-secondary, #02bfe7)"
      />
      <KpiCard
        label="Median Size"
        value={formatNumber(data.median_size)}
        subtitle="Median capability statement size (bytes)"
        borderColor="var(--color-success, #2e8540)"
      />
      <KpiCard
        label="Largest Size"
        value={formatNumber(data.largest_size)}
        subtitle="Maximum capability statement size (bytes)"
        borderColor="var(--color-primary, #205493)"
      />
      <KpiCard
        label="Smallest Size"
        value={formatNumber(data.smallest_size)}
        subtitle="Minimum capability statement size (bytes)"
        borderColor="var(--color-warning, #fdb81e)"
      />
    </div>
  );
}
