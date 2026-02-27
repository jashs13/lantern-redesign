import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
import { Pagination } from '@/components/ui/Pagination';
import type { SearchResult } from '@/api/types';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  // Local state for pagination avoids URL clutter and prevents scroll jumping
  const [endpointPage, setEndpointPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);

  const [localSearch, setLocalSearch] = useState(queryParam);

  // Sync input when URL changes (e.g. popular search links)
  // Also reset local page states when a brand new search term arrives
  useEffect(() => {
    setLocalSearch(queryParam);
    setEndpointPage(1);
    setOrgPage(1);
    setVendorPage(1);
  }, [queryParam]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', queryParam, endpointPage, orgPage, vendorPage],
    queryFn: () => fetchSearch({
      q: queryParam,
      limit: 10,
      endpoint_page: endpointPage,
      organization_page: orgPage,
      vendor_page: vendorPage
    }),
    enabled: queryParam.length > 0,
    placeholderData: keepPreviousData, // Prevent layout jumps when turning pages
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

  const endpointCount = data?.endpoints_total ?? 0;
  const orgCount = data?.organizations_total ?? 0;
  const vendorCount = data?.vendors_total ?? 0;
  const totalCount = data?.total_count ?? 0;

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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
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
              <Badge variant="success">{vendorCount} Developers</Badge>
            )}
          </div>

          {/* Endpoint results */}
          {data!.endpoints && data!.endpoints.length > 0 && (
            <ResultSection
              title="Endpoints"
              icon={<Globe size={20} />}
              count={endpointCount}
              results={data!.endpoints}
              renderItem={(item, index) => (
                <EndpointResultCard key={`endpoint-${index}`} item={item} />
              )}
              pagination={
                endpointCount > 10 ? (
                  <Pagination
                    page={endpointPage}
                    totalPages={Math.ceil(endpointCount / 10)}
                    totalCount={endpointCount}
                    pageSize={10}
                    hideStats={false}
                    onPageChange={(p) => setEndpointPage(p)}
                  />
                ) : undefined
              }
            />
          )}

          {/* Organization results */}
          {data!.organizations && data!.organizations.length > 0 && (
            <ResultSection
              title="Organizations"
              icon={<Building2 size={20} />}
              count={orgCount}
              results={data!.organizations}
              renderItem={(item, index) => (
                <OrganizationResultCard key={`org-${index}`} item={item} />
              )}
              pagination={
                orgCount > 10 ? (
                  <Pagination
                    page={orgPage}
                    totalPages={Math.ceil(orgCount / 10)}
                    totalCount={orgCount}
                    pageSize={10}
                    hideStats={false}
                    onPageChange={(p) => setOrgPage(p)}
                  />
                ) : undefined
              }
            />
          )}

          {/* Vendor results */}
          {data!.vendors && data!.vendors.length > 0 && (
            <ResultSection
              title="Developers / Vendors"
              icon={<Monitor size={20} />}
              count={vendorCount}
              results={data!.vendors}
              renderItem={(item, index) => (
                <VendorResultCard key={`vendor-${index}`} item={item} />
              )}
              pagination={
                vendorCount > 10 ? (
                  <Pagination
                    page={vendorPage}
                    totalPages={Math.ceil(vendorCount / 10)}
                    totalCount={vendorCount}
                    pageSize={10}
                    hideStats={false}
                    onPageChange={(p) => setVendorPage(p)}
                  />
                ) : undefined
              }
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
  pagination,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  results: SearchResult[];
  renderItem: (item: SearchResult, index: number) => React.ReactNode;
  pagination?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-navy-700">{icon}</span>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        <Badge variant="navy">{count}</Badge>
      </div>
      <div className="space-y-1.5">{results.map((item, index) => renderItem(item, index))}</div>
      {pagination && <div className="mt-3 border-t border-neutral-100 pt-3">{pagination}</div>}
    </section>
  );
}

/* ── Endpoint Result Card ───────────────────────────────────────────── */

function EndpointResultCard({ item }: { item: SearchResult }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-2.5 transition-all hover:shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-baseline gap-3">
          <h3 className="font-semibold text-sm text-navy-900">{item.name}</h3>
        </div>
        {/* TODO: Fix these links to point to actual working pages once implemented */}
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
    <div className="rounded-lg border border-neutral-200 bg-white p-2.5 transition-all hover:shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <h3 className="font-semibold text-sm text-navy-900">{item.name}</h3>
          {firstAddress && (
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <MapPin size={12} className="shrink-0 text-neutral-400" />
              <span className="truncate">{firstAddress}</span>
            </p>
          )}
        </div>
        {/* TODO: Fix these links to point to actual working pages once implemented */}
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
    <div className="rounded-lg border border-neutral-200 bg-white p-2.5 transition-all hover:shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <h3 className="font-semibold text-sm text-navy-900">{item.name}</h3>
          {item.description && (
            <p className="line-clamp-1 text-xs text-neutral-500">{item.description}</p>
          )}
        </div>
        {/* TODO: Fix these links to point to actual working pages once implemented */}
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
