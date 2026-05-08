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
import { Modal } from '@/components/ui/Modal';
import { EndpointDetailModal } from '@/features/endpoints/EndpointDetailModal';
import { ShieldCheck, ShieldOff, Shield, Key } from 'lucide-react';
import type { SecurityEndpoint } from '@/api/types';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

/* ── Auth type card metadata ─────────────────────────────────────── */

const AUTH_TYPE_CARDS: {
  code: string;
  label: string;
  description: string;
  icon: string;
  barColor: string;
  iconBg: string;
}[] = [
  {
    code: 'Basic',
    label: 'HTTP Basic',
    description: 'Username/password authentication sent with each request. Simple but less secure for patient-facing apps.',
    icon: '\uD83D\uDD11',
    barColor: '#fdb81e',
    iconBg: '#fff3e0',
  },
  {
    code: 'Certificates',
    label: 'Certificates',
    description: 'Mutual TLS or certificate-based authentication. Used in server-to-server communication scenarios.',
    icon: '\uD83D\uDCDC',
    barColor: '#051359',
    iconBg: '#e8eef6',
  },
  {
    code: 'OAuth',
    label: 'OAuth 2.0',
    description: 'OAuth 2.0 authorization without SMART App Launch framework, including custom OAuth flows.',
    icon: '\uD83D\uDD13',
    barColor: '#02bfe7',
    iconBg: '#e1f5fe',
  },
  {
    code: 'SMART-on-FHIR',
    label: 'SMART-on-FHIR',
    description: 'SMART App Launch with OAuth 2.0 \u2014 the standard required by ONC for patient-facing apps.',
    icon: '\uD83D\uDD12',
    barColor: '#2e8540',
    iconBg: '#e7f4e9',
  },
  {
    code: 'UDAP',
    label: 'UDAP',
    description: 'Unified Data Access Profiles \u2014 trust framework for cross-organizational identity and authorization.',
    icon: '\uD83C\uDF10',
    barColor: '#8a63d2',
    iconBg: '#f3eefa',
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function getFhirBadgeVariant(ver: string | null) {
  if (!ver) return 'default' as const;
  if (ver.startsWith('4.0')) return 'fhir-r4' as const;
  return 'fhir' as const;
}

function getFhirLabel(ver: string | null) {
  if (!ver) return '\u2014';
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
  onShowOrgs: (url: string) => void,
  onOpenDetail: (url: string) => void
): ColumnDef<SecurityEndpoint, unknown>[] {
  return [
    {
      accessorKey: 'url',
      header: 'Endpoint',
      size: 32,
      cell: ({ getValue }) => {
        const url = getValue() as string;
        return (
          <button
            type="button"
            className="truncate block w-full text-left font-semibold text-navy-700 text-xs hover:underline"
            onClick={() => onOpenDetail(url)}
          >
            {url || '\u2014'}
          </button>
        );
      },
    },
    {
      accessorKey: 'org_names',
      header: 'Organization',
      size: 22,
      cell: ({ getValue, row }) => {
        const names = parseOrgNames(getValue() as string | null);
        if (names.length === 0) return <span className="text-neutral-400 text-xs">{'\u2014'}</span>;
        const visible = names.slice(0, 3);
        return (
          <div className="min-w-0 max-w-[180px]">
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
        <span className="truncate block text-xs">{(getValue() as string | null) || '\u2014'}</span>
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
          <span className="text-neutral-400 text-xs">{'\u2014'}</span>
        );
      },
    },
  ];
}

export function AuthorizationTypesTab() {
  const { filters } = useFilters();
  const { page, pageSize, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 800);
  const [authType, setAuthType] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [activeFhirVersions, setActiveFhirVersions] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [orgNamesUrl, setOrgNamesUrl] = useState<string | null>(null);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const { data: orgNames = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['security-orgs', orgNamesUrl],
    queryFn: () => fetchSecurityOrgs(orgNamesUrl!),
    enabled: !!orgNamesUrl,
    staleTime: 5 * 60 * 1000,
  });

  const columns = buildColumns(
    (url) => setOrgNamesUrl(url),
    (url) => setSelectedEndpointUrl(url)
  );

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

  const authTypeTotals = (summary?.auth_type_counts ?? []).reduce<Record<string, number>>((acc, at) => {
    acc[at.code] = (acc[at.code] ?? 0) + at.count;
    return acc;
  }, {});
  const authTypeCodes = Object.keys(authTypeTotals).sort();

  // Compute KPI values (same logic as legacy SecurityPage)
  const securityCountRows = summary?.security_counts ?? [];
  const totalSecured =
    securityCountRows.find((r) => r.status.toLowerCase().includes('valid security'))?.endpoints ?? 0;
  const totalEndpointsFromSummary =
    securityCountRows.find((r) => r.status.toLowerCase().includes('total indexed'))?.endpoints ?? 0;
  const totalUnsecured = totalEndpointsFromSummary > 0 ? totalEndpointsFromSummary - totalSecured : 0;
  const coveragePct =
    totalEndpointsFromSummary > 0 ? ((totalSecured / totalEndpointsFromSummary) * 100).toFixed(1) : '0';

  const fhirFilterGroups = (['DSTU2', 'STU3', 'R4', 'R4B', 'R5', 'No Cap Stat', 'Unknown'] as const).filter(
    (g) => availableGroups?.includes(g)
  );

  const filterParams = {
    fhir_versions: activeFhirVersions.size > 0 ? Array.from(activeFhirVersions) : filters.fhirVersions,
    vendor: vendor || filters.vendor || undefined,
    auth_type: authType || undefined,
    search: debouncedSearch.length >= 3 ? debouncedSearch : undefined,
  };
  const filterKey = [filters, debouncedSearch, vendor, authType, Array.from(activeFhirVersions).sort()];

  const { data, isLoading } = useQuery({
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

  const clearAllFilters = () => {
    setActiveFhirVersions(new Set());
    setAuthType(null);
    setSearch('');
    setVendor(null);
    setPage(1);
  };

  return (
    <>
      {/* Callout */}
      <div className="flex gap-4 p-5 bg-blue-50 border-l-4 border-cyan-500 rounded mb-6">
        <div className="text-xl flex-shrink-0">&#x1F6C8;</div>
        <div className="text-sm text-neutral-700">
          <strong className="text-navy-900">About this data:</strong> Authorization types are extracted from the <code className="text-xs bg-white/60 px-1 py-0.5 rounded">rest.security</code> section of each endpoint's FHIR Capability Statement. An endpoint may declare multiple authorization types.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
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
          borderColor="#0f2f8a"
          icon={<Shield size={18} />}
        />
        <KpiCard
          label="Auth Types"
          value={authTypeCodes.length}
          borderColor="#02bfe7"
          icon={<Key size={18} />}
        />
      </div>

      {/* Authorization Type Distribution — 5 cards with progress bars */}
      <section
        className="rounded-lg bg-white mb-6 overflow-hidden"
        style={{ boxShadow: 'var(--shadow-sm)' }}
        aria-labelledby="auth-overview-heading"
      >
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200">
          <h2
            id="auth-overview-heading"
            className="font-serif text-lg font-bold text-navy-900"
          >
            Authorization Type Distribution
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            How endpoints declare their security posture in capability statements
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AUTH_TYPE_CARDS.map((card) => {
              const count = authTypeTotals[card.code] ?? 0;
              const pct =
                totalEndpointsFromSummary > 0
                  ? ((count / totalEndpointsFromSummary) * 100).toFixed(1)
                  : '0';
              return (
                <article
                  key={card.code}
                  className="border border-neutral-200 rounded-lg p-5 transition-all hover:border-primary-light hover:shadow-md flex flex-col"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <div className="font-bold text-base text-navy-900">{card.label}</div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: card.iconBg }}
                      aria-hidden="true"
                    >
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed flex-1">{card.description}</p>
                  {/* Bottom-aligned stats + bar */}
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-navy-900 leading-tight">
                      {count.toLocaleString()}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">{pct}% of endpoints</div>
                    <div className="mt-3 h-1.5 rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(parseFloat(pct), 100)}%`,
                          backgroundColor: card.barColor,
                        }}
                      />
                    </div>
                    <p
                      className="mt-1 text-right text-xs font-semibold"
                      style={{ color: card.barColor }}
                    >
                      {pct}%
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white mb-6"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter security endpoints"
      >
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by URL, vendor, or auth type..."
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2 md:col-span-1">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Auth Quick Filters
            </label>
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              FHIR Version
            </label>
            <Select
              value={activeFhirVersions.size === 1 ? Array.from(activeFhirVersions)[0] : '__all__'}
              onValueChange={(v) => {
                setActiveFhirVersions(v === '__all__' ? new Set() : new Set([v]));
                setPage(1);
              }}
              options={[
                { value: '__all__', label: 'All Versions' },
                ...fhirFilterGroups.map((g) => ({ value: g, label: g })),
              ]}
              placeholder="All Versions"
            />
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
      <div className="flex items-center justify-between mb-2">
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

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
      />
    </>
  );
}
