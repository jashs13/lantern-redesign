import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchSecurity, fetchSecuritySummary, fetchSecurityOrgs } from '@/api/security';
import { fetchVendors, fetchFHIRVersionGroups } from '@/api/filters';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { QuickFilter } from '@/components/ui/QuickFilter';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Shield, ShieldCheck, ShieldOff, Key } from 'lucide-react';
import type { SecurityEndpoint } from '@/api/types';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

const FHIR_GROUP_ORDER = ['DSTU2', 'STU3', 'R4', 'R4B', 'R5', 'No Cap Stat', 'Unknown'] as const;

function getFhirBadgeVariant(ver: string | null) {
  if (!ver) return 'default' as const;
  if (ver.startsWith('4.0')) return 'fhir-r4' as const;
  return 'fhir' as const;
}

function getFhirLabel(ver: string | null) {
  if (!ver) return '—';
  if (ver.startsWith('4.0')) return 'R4';
  if (ver.startsWith('3.0')) return 'STU3';
  if (ver.startsWith('1.0')) return 'DSTU2';
  if (ver.startsWith('4.1') || ver.startsWith('4.3')) return 'R4B';
  if (ver.startsWith('5.0')) return 'R5';
  return ver;
}

function parseOrgNames(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(';').map((s) => s.trim()).filter(Boolean);
}

function buildColumns(
  onShowOrgs: (url: string) => void
): ColumnDef<SecurityEndpoint, unknown>[] {
  return [
    {
      accessorKey: 'url',
      header: 'Endpoint',
      size: 32,
      cell: ({ getValue }) => {
        const url = getValue() as string;
        return (
          <span className="truncate block font-semibold text-navy-700 text-xs">{url || '—'}</span>
        );
      },
    },
    {
      accessorKey: 'org_names',
      header: 'Organization',
      size: 22,
      cell: ({ getValue, row }) => {
        const names = parseOrgNames(getValue() as string | null);
        if (names.length === 0) return <span className="text-neutral-400 text-xs">—</span>;
        const visible = names.slice(0, 3);
        return (
          <div className="min-w-0">
            <p className="truncate text-xs text-neutral-600">{visible.join('; ')}</p>
            {row.original.has_more_orgs && (
              <button
                className="mt-0.5 text-xs font-semibold text-navy-700 hover:underline"
                onClick={() => onShowOrgs(row.original.url)}
              >
                Show all
              </button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'vendor_name',
      header: 'Developer',
      size: 18,
      cell: ({ getValue }) => (
        <span className="truncate block text-xs">{(getValue() as string | null) || '—'}</span>
      ),
    },
    {
      accessorKey: 'fhir_version',
      header: 'FHIR',
      size: 12,
      cell: ({ getValue }) => {
        const ver = getValue() as string | null;
        return <Badge variant={getFhirBadgeVariant(ver)}>{getFhirLabel(ver)}</Badge>;
      },
    },
    {
      accessorKey: 'security_code',
      header: 'Auth Type',
      size: 16,
      cell: ({ getValue }) => {
        const code = getValue() as string | null;
        return code ? (
          <span className="inline-flex items-center rounded bg-status-green-bg px-2 py-0.5 text-xs font-medium text-status-green">
            {code}
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">—</span>
        );
      },
    },
  ];
}

export default function SecurityPage() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 800);
  const [activeFhirVersions, setActiveFhirVersions] = useState<Set<string>>(new Set());
  const [authType, setAuthType] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [orgNamesUrl, setOrgNamesUrl] = useState<string | null>(null);

  const { data: orgNames = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['security-orgs', orgNamesUrl],
    queryFn: () => fetchSecurityOrgs(orgNamesUrl!),
    enabled: !!orgNamesUrl,
    staleTime: 5 * 60 * 1000,
  });

  const columns = buildColumns((url) => setOrgNamesUrl(url));

  const { data: summary } = useQuery({
    queryKey: ['security', 'summary', filters.fhirVersions],
    queryFn: () => fetchSecuritySummary({ fhir_versions: filters.fhirVersions }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: availableGroups } = useQuery({
    queryKey: ['filters', 'fhir-version-groups'],
    queryFn: fetchFHIRVersionGroups,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const fhirFilterGroups = FHIR_GROUP_ORDER.filter((g) => availableGroups?.includes(g));

  // Aggregate auth type counts across FHIR versions
  const authTypeTotals = (summary?.auth_type_counts ?? []).reduce<Record<string, number>>((acc, at) => {
    acc[at.code] = (acc[at.code] ?? 0) + at.count;
    return acc;
  }, {});
  const authTypeCodes = Object.keys(authTypeTotals).sort();

  // Parse mv_endpoint_security_counts rows by matching status label text
  const securityCountRows = summary?.security_counts ?? [];
  const totalSecured =
    securityCountRows.find((r) => r.status.toLowerCase().includes('valid security'))?.endpoints ?? 0;
  const totalEndpointsFromSummary =
    securityCountRows.find((r) => r.status.toLowerCase().includes('total indexed'))?.endpoints ?? 0;
  const totalUnsecured = totalEndpointsFromSummary > 0 ? totalEndpointsFromSummary - totalSecured : 0;
  const totalForCoverage = totalEndpointsFromSummary;
  const coveragePct =
    totalForCoverage > 0 ? ((totalSecured / totalForCoverage) * 100).toFixed(1) : '0';

  const filterParams = {
    fhir_versions: activeFhirVersions.size > 0 ? Array.from(activeFhirVersions) : filters.fhirVersions,
    vendor: vendor || filters.vendor || undefined,
    auth_type: authType || undefined,
    search: debouncedSearch.length >= 3 ? debouncedSearch : undefined,
  };
  const filterKey = [filters, debouncedSearch, vendor, authType, Array.from(activeFhirVersions).sort()];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['security-data', page, pageSize, sorting, ...filterKey],
    queryFn: () =>
      fetchSecurity({
        ...filterParams,
        page,
        page_size: pageSize,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const totalCount = data?.pagination.total_count ?? 0;
  const tableData = data?.data ?? [];

  const hasActiveFilters = activeFhirVersions.size > 0 || !!authType || !!search || !!vendor;

  const toggleFhirVersion = (key: string) => {
    setActiveFhirVersions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPage(1);
  };

  const clearAllFilters = () => {
    setActiveFhirVersions(new Set());
    setAuthType(null);
    setSearch('');
    setVendor(null);
    setPage(1);
  };

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Analysis"
        subtitle="Security configurations and authentication methods across FHIR endpoints"
        breadcrumbs={[{ label: 'Security' }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Secured Endpoints"
          value={totalSecured}
          borderColor="#2e8540"
          icon={<ShieldCheck size={18} />}
        />
        <KpiCard
          label="Unsecured Endpoints"
          value={totalUnsecured}
          borderColor="#e31c3d"
          icon={<ShieldOff size={18} />}
        />
        <KpiCard
          label="Security Coverage"
          value={`${coveragePct}%`}
          borderColor="#205493"
          icon={<Shield size={18} />}
        />
        <KpiCard
          label="Auth Types"
          value={authTypeCodes.length}
          borderColor="#02bfe7"
          icon={<Key size={18} />}
        />
      </div>

      {/* Auth Type Breakdown */}
      {authTypeCodes.length > 0 && (
        <section
          className="rounded-md bg-white"
          style={{ padding: '1rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}
        >
          <p
            className="mb-3 font-sans font-bold uppercase"
            style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
          >
            Authorization Type Distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {authTypeCodes.map((code) => (
              <div
                key={code}
                className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5"
              >
                <span className="text-sm font-semibold text-neutral-700">{code}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                  style={{ background: '#205493', color: '#fff' }}
                >
                  {(authTypeTotals[code] ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter security endpoints"
      >
        {/* Search row */}
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by URL, vendor, or auth type..."
            className="w-full"
          />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Quick Filters
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">FHIR:</span>
              {fhirFilterGroups.map((group) => (
                <QuickFilter
                  key={group}
                  label={group}
                  active={activeFhirVersions.has(group)}
                  onClick={() => toggleFhirVersion(group)}
                />
              ))}
              {authTypeCodes.length > 0 && (
                <>
                  <span className="mx-1 text-neutral-300">|</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Auth:</span>
                  {authTypeCodes.map((code) => (
                    <QuickFilter
                      key={code}
                      label={code}
                      active={authType === code}
                      onClick={() => {
                        setAuthType((prev) => (prev === code ? null : code));
                        setPage(1);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              EHR Developer
            </label>
            <Select
              value={vendor ?? '__all__'}
              onValueChange={(v) => { setVendor(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendorOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div
            className="mt-4 flex justify-end"
            style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-gray-lighter)' }}
          >
            <button
              onClick={clearAllFilters}
              className="text-sm font-semibold text-neutral-500 hover:text-navy-700 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {/* Results bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing{' '}
          <span className="font-semibold text-neutral-700">
            {totalCount.toLocaleString()}
          </span>{' '}
          results
        </p>
      </div>

      {/* Table */}
      <DataTable
        data={tableData}
        columns={columns}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
      />

      {/* Org Names Modal */}
      {orgNamesUrl && (
        <Modal
          open={!!orgNamesUrl}
          onOpenChange={(open) => { if (!open) setOrgNamesUrl(null); }}
          title="Organizations"
          maxWidth="max-w-lg"
        >
          <p className="mb-3 text-sm text-neutral-500">{orgNamesUrl}</p>
          {orgsLoading ? (
            <p className="text-sm text-neutral-400">Loading...</p>
          ) : (
            <ul className="space-y-1">
              {orgNames.map((name, i) => (
                <li key={i} className="border-b border-neutral-100 pb-1 text-sm text-neutral-800 last:border-0">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
