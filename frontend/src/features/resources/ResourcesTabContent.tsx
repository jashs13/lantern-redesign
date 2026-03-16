import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchResources, fetchResourcesChart } from '@/api/resources';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import type { Resource } from '@/api/types';
import { Select } from '@/components/ui/Select';
import { FilterTag } from '@/components/ui/FilterTag';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatNumber } from '@/lib/formatters';
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { ResourceCard, ResourceCardSkeleton } from './ResourceCard';
import { ResourceStatsCards } from './ResourceStatsCards';
import { ResourceMatrix } from './ResourceMatrix';

const LABEL_STYLE = {
  fontSize: '0.8125rem',
  color: 'var(--color-gray-dark)',
  letterSpacing: '0.03em',
  fontWeight: 700,
};

const ALL = '__all__';

// Maps each category to the FHIR resource types it contains.
// Mirrors fhirResourceCategories in api/internal/handlers/resources.go.
const CATEGORY_TO_RESOURCES: Record<string, string[]> = {
  Clinical: [
    'AllergyIntolerance', 'CarePlan', 'CareTeam', 'Condition', 'DiagnosticReport',
    'DocumentReference', 'Encounter', 'Goal', 'Immunization', 'MedicationAdministration',
    'MedicationRequest', 'Observation', 'Procedure', 'Provenance',
  ],
  Financial: [
    'Claim', 'ClaimResponse', 'Coverage', 'CoverageEligibilityRequest', 'ExplanationOfBenefit',
  ],
  Administrative: [
    'Device', 'Location', 'Organization', 'Patient', 'Practitioner',
    'PractitionerRole', 'RelatedPerson', 'Schedule', 'Slot',
  ],
  Foundation: [
    'CapabilityStatement', 'CodeSystem', 'ConceptMap', 'OperationDefinition',
    'SearchParameter', 'StructureDefinition', 'ValueSet',
  ],
};

const CATEGORIES = ['Clinical', 'Financial', 'Administrative', 'Foundation', 'Other'];

type ViewMode = 'cards' | 'matrix';

export default function ResourcesTabContent({ asTab = false }: { asTab?: boolean } = {}) {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination(24);

  const [view, setView] = useState<ViewMode>('cards');
  const [fhirVersions, setFhirVersions] = useState<string[]>(filters.fhirVersions ?? []);
  const [vendor, setVendor] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const { data: chartRaw, isLoading: isChartLoading } = useQuery<Resource[]>({
    queryKey: ['resources-chart'],
    queryFn: () => fetchResourcesChart(),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!chartRaw) return [];
    return chartRaw
      .filter((r) => !category || CATEGORY_TO_RESOURCES[category]?.includes(r.resource_type))
      .map((r) => ({ name: r.resource_type, value: r.support_percent }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [chartRaw, category]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resources', page, pageSize, fhirVersions, vendor, category, debouncedSearch],
    queryFn: () =>
      fetchResources({
        page,
        page_size: pageSize,
        fhir_versions: fhirVersions.length > 0 ? fhirVersions : undefined,
        vendor: vendor ?? undefined,
        resources: category && CATEGORY_TO_RESOURCES[category]
          ? CATEGORY_TO_RESOURCES[category]
          : undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: view === 'cards',
  });

  function handleFhirVersionChange(v: string[]) {
    setFhirVersions(v);
    setPage(1);
  }

  function handleVendorChange(v: string) {
    setVendor(v === ALL ? null : v);
    setPage(1);
  }

  function handleCategoryChange(v: string) {
    setCategory(v === ALL ? null : v);
    setPage(1);
  }

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const totalCount = data?.pagination.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-5">
      {!asTab && (
        <PageHeader
          title="FHIR Resources"
          subtitle={`Browse ${totalCount.toLocaleString()} resource types across FHIR endpoints`}
          breadcrumbs={[{ label: 'Resources' }]}
        />
      )}

      {/* Summary stat cards */}
      <ResourceStatsCards />

      {/* Resource support chart */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Resource support chart"
      >
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            Resource Support Across Endpoints
          </span>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
            Top 5 resource types by percentage of endpoints declaring support
            {category ? ` — ${category} category` : ''}
          </p>
        </div>
        {isChartLoading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray)', fontSize: '0.875rem' }}>
            Loading chart…
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray)', fontSize: '0.875rem' }}>
            No data available for current filters.
          </div>
        ) : (
          <HorizontalBarChart
            data={chartData}
            xTickFormatter={(v) => `${v}%`}
            tooltipFormatter={(v) => `${v.toFixed(1)}%`}
          />
        )}
      </section>

      {/* Filters card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Filters"
      >
        {/* Search row + view toggle */}
        <div className="mb-4 flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by resource name..."
            className="max-w-md flex-1"
          />

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setView('cards')}
              style={{
                padding: '0.375rem 0.875rem',
                fontSize: '0.875rem',
                background: view === 'cards' ? 'var(--color-primary, #205493)' : 'transparent',
                color: view === 'cards' ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontWeight: view === 'cards' ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setView('matrix')}
              style={{
                padding: '0.375rem 0.875rem',
                fontSize: '0.875rem',
                background: view === 'matrix' ? 'var(--color-primary, #205493)' : 'transparent',
                color: view === 'matrix' ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontWeight: view === 'matrix' ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              Matrix
            </button>
          </div>
        </div>

        {/* Filter dropdowns — FHIR Version and EHR Developer only in cards mode */}
        <div className={`grid grid-cols-1 gap-4 ${view === 'cards' ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-xs'}`}>
          {view === 'cards' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
                  FHIR Version
                </label>
                <MultiSelectDropdown
                  options={fhirVersionOptions.map((o) => o.value)}
                  selected={fhirVersions}
                  onChange={handleFhirVersionChange}
                  placeholder="All Versions"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
                  EHR Developer
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
            </>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={LABEL_STYLE}>
              Category
            </label>
            <Select
              value={category ?? ALL}
              onValueChange={handleCategoryChange}
              options={[
                { value: ALL, label: 'All Categories' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              placeholder="All Categories"
            />
          </div>
        </div>

        {/* Active filter tags — only in cards mode */}
        {view === 'cards' && (vendor || category) && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
            aria-live="polite"
          >
            {vendor && (
              <FilterTag
                label="Developer"
                value={vendor}
                onRemove={() => { setVendor(null); setPage(1); }}
              />
            )}
            {category && (
              <FilterTag
                label="Category"
                value={category}
                onRemove={() => { setCategory(null); setPage(1); }}
              />
            )}
          </div>
        )}
      </section>

      {/* Main content — matrix or card grid */}
      {view === 'matrix' ? (
        <ResourceMatrix category={category} search={debouncedSearch} />
      ) : (
        <>
          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="font-sans" style={{ fontSize: '0.9375rem', color: 'var(--color-gray)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>
                {formatNumber(totalCount)}
              </strong>{' '}
              resource types
            </p>
          </div>

          {/* Card grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {isLoading
              ? Array.from({ length: pageSize }).map((_, i) => <ResourceCardSkeleton key={i} />)
              : (data?.data ?? []).map((resource, i) => (
                  <ResourceCard key={i} resource={resource} />
                ))
            }
          </div>

          {/* Pagination */}
          {!isLoading && totalCount > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
