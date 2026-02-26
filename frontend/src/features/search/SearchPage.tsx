import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSearch } from '@/api/search';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  Globe,
  Building2,
  Monitor,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import type { SearchResult } from '@/api/types';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [localSearch, setLocalSearch] = useState(queryParam);

  // Sync input when URL changes (e.g. popular search links)
  useEffect(() => {
    setLocalSearch(queryParam);
  }, [queryParam]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', queryParam],
    queryFn: () => fetchSearch({ q: queryParam, limit: 25 }),
    enabled: queryParam.length > 0,
  });

  const handleSearch = (value: string) => {
    setLocalSearch(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchParams({ q: localSearch.trim() });
    }
  };

  const endpointCount = data?.endpoints?.length ?? 0;
  const orgCount = data?.organizations?.length ?? 0;
  const vendorCount = data?.vendors?.length ?? 0;
  const totalCount = endpointCount + orgCount + vendorCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        subtitle="Search across endpoints, organizations, and developers"
        breadcrumbs={[{ label: 'Search' }]}
      />

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 sm:max-w-2xl">
        <div className="flex-1">
          <SearchInput
            value={localSearch}
            onChange={handleSearch}
            placeholder="Search by name, location, or FHIR URL..."
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-navy-700 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {!queryParam && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-500">Enter a search term to find endpoints, organizations, or developers.</p>
        </div>
      )}

      {queryParam && isLoading && <LoadingState />}

      {queryParam && error && (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      )}

      {queryParam && !isLoading && !error && totalCount === 0 && (
        <EmptyState />
      )}

      {queryParam && !isLoading && !error && totalCount > 0 && (
        <div className="space-y-8">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <span>
              Found <strong className="text-neutral-700">{totalCount}</strong> results for{' '}
              <strong className="text-neutral-700">"{queryParam}"</strong>
            </span>
            {endpointCount > 0 && (
              <Badge variant="info">{endpointCount} Endpoints</Badge>
            )}
            {orgCount > 0 && (
              <Badge variant="navy">{orgCount} Organizations</Badge>
            )}
            {vendorCount > 0 && (
              <Badge variant="fhir">{vendorCount} Developers</Badge>
            )}
          </div>

          {/* Endpoint results */}
          {endpointCount > 0 && (
            <ResultSection
              title="Endpoints"
              icon={<Globe size={20} />}
              count={endpointCount}
              results={data!.endpoints}
              renderItem={(item, index) => (
                <EndpointResultCard key={`endpoint-${index}`} item={item} />
              )}
            />
          )}

          {/* Organization results */}
          {orgCount > 0 && (
            <ResultSection
              title="Organizations"
              icon={<Building2 size={20} />}
              count={orgCount}
              results={data!.organizations}
              renderItem={(item, index) => (
                <OrganizationResultCard key={`org-${index}`} item={item} />
              )}
            />
          )}

          {/* Vendor results */}
          {vendorCount > 0 && (
            <ResultSection
              title="Developers / Vendors"
              icon={<Monitor size={20} />}
              count={vendorCount}
              results={data!.vendors}
              renderItem={(item, index) => (
                <VendorResultCard key={`vendor-${index}`} item={item} />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Result Section ─────────────────────────────────────────────────── */

function ResultSection({
  title,
  icon,
  count,
  results,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  results: SearchResult[];
  renderItem: (item: SearchResult, index: number) => React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-navy-700">{icon}</span>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        <Badge variant="navy">{count}</Badge>
      </div>
      <div className="space-y-2">{results.map((item, index) => renderItem(item, index))}</div>
    </section>
  );
}

/* ── Endpoint Result Card ───────────────────────────────────────────── */

function EndpointResultCard({ item }: { item: SearchResult }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-navy-900">{item.name}</h3>
          {item.url && (
            <p className="mt-1 truncate font-mono text-xs text-neutral-500">{item.url}</p>
          )}
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{item.description}</p>
          )}
        </div>
        <Link
          to={`/endpoints?search=${encodeURIComponent(item.name)}`}
          className="shrink-0 text-navy-700 hover:text-sky-600"
          title="View in endpoints"
        >
          <ExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
}

/* ── Organization Result Card ───────────────────────────────────────── */

function OrganizationResultCard({ item }: { item: SearchResult }) {
  // Description often contains newline-separated addresses — show the first one
  const firstAddress = item.description?.split('\n')[0] || '';

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-navy-900">{item.name}</h3>
          {firstAddress && (
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin size={13} className="shrink-0 text-neutral-400" />
              <span className="truncate">{firstAddress}</span>
            </p>
          )}
        </div>
        <Link
          to={`/organizations?search=${encodeURIComponent(item.name)}`}
          className="shrink-0 text-navy-700 hover:text-sky-600"
          title="View in organizations"
        >
          <ExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
}

/* ── Vendor Result Card ─────────────────────────────────────────────── */

function VendorResultCard({ item }: { item: SearchResult }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-navy-900">{item.name}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{item.description}</p>
          )}
        </div>
        <Link
          to={`/endpoints?search=${encodeURIComponent(item.name)}`}
          className="shrink-0 text-navy-700 hover:text-sky-600"
          title="View endpoints by this vendor"
        >
          <ExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
}
