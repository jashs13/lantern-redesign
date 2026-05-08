import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchSmartResponse, fetchSmartSummary } from '@/api/smart';
import { fetchSecurityOrgs } from '@/api/security';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EndpointDetailModal } from '@/features/endpoints/EndpointDetailModal';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Database, CheckCircle, XCircle, FileJson } from 'lucide-react';
import type { SmartEndpoint, SmartCapability } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

function parseOrgNames(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(';').map((s) => s.trim()).filter(Boolean);
}

function buildColumns(
  onShowOrgs: (url: string) => void,
  onOpenDetail: (url: string) => void
): ColumnDef<SmartEndpoint, unknown>[] {
  return [
    {
      accessorKey: 'url',
      header: 'URL',
      size: 250,
      cell: ({ getValue }) => {
        const url = getValue() as string;
        return (
          <button
            type="button"
            className="font-mono text-xs text-navy-700 block truncate max-w-[250px] text-left hover:underline"
            title={url}
            onClick={() => onOpenDetail(url)}
          >
            {url || '—'}
          </button>
        );
      },
    },
    {
      accessorKey: 'organization_names',
      header: 'Organization',
      size: 200,
      cell: ({ getValue, row }) => {
        const names = parseOrgNames(getValue() as string | null);
        if (names.length === 0) return <span className="text-neutral-400 text-xs">—</span>;
        const visible = names.slice(0, 3);
        return (
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-xs text-neutral-600">{visible.join('; ')}</p>
            {names.length > 3 && (
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
      size: 100,
      cell: ({ getValue }) => {
        const vendor = getValue() as string | null;
        return vendor ? (
          <Badge variant="navy" className="whitespace-nowrap">{vendor}</Badge>
        ) : (
          <span className="text-neutral-400">—</span>
        );
      },
    },
    {
      accessorKey: 'fhir_version',
      header: 'FHIR Version',
      size: 100,
      cell: ({ getValue }) => {
        const ver = getValue() as string | null;
        if (!ver) return '—';
        return <Badge variant={ver.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>{ver}</Badge>;
      },
    },
  ];
}

const capabilityColumns: ColumnDef<SmartCapability, unknown>[] = [
  {
    accessorKey: 'capability',
    header: 'Core Capability',
    cell: ({ getValue }) => <span className="font-semibold text-navy-700">{getValue() as string}</span>,
  },
  {
    accessorKey: 'count',
    header: 'Endpoints',
    size: 150,
  },
];

export default function SmartResponsePage() {
  const { filters, setVendor, setFhirVersions, resetFilters } = useFilters();
  const { page, pageSize, setPage } = usePagination(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [orgNamesUrl, setOrgNamesUrl] = useState<string | null>(null);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const { data: orgNames = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['smart-orgs', orgNamesUrl],
    queryFn: () => fetchSecurityOrgs(orgNamesUrl!),
    enabled: !!orgNamesUrl,
    staleTime: 5 * 60 * 1000,
  });

  const columns = buildColumns(
    (url) => setOrgNamesUrl(url),
    (url) => setSelectedEndpointUrl(url)
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['smart-response', page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      fetchSmartResponse({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['smart-summary', filters],
    queryFn: () => fetchSmartSummary({
      fhir_versions: filters.fhirVersions,
      vendor: filters.vendor || undefined
    }),
  });

  const { data: fhirVersions } = useQuery({
    queryKey: ['fhir-versions'],
    queryFn: fetchFHIRVersions,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMART Response"
        subtitle="SMART on FHIR capabilities and response data for endpoints"
        breadcrumbs={[{ label: 'SMART Response' }]}
        titleClassName="font-sans text-2xl font-bold text-navy-900"
      >
        <p className="text-neutral-600 text-sm mt-2 whitespace-nowrap">
          FHIR endpoints requiring authorization shall provide a JSON document at the endpoint URL with <code>/.well-known/smart-configuration</code> appended to the end of the base URL.
        </p>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Indexed" value={summaryData?.total_indexed ?? 0} borderColor="#0f2f8a" icon={<Database size={18} />} />
        <KpiCard label="HTTP 200" value={summaryData?.http_200 ?? 0} borderColor="#2e8540" icon={<CheckCircle size={18} />} />
        <KpiCard label="SMART HTTP 200" value={summaryData?.smart_http_200 ?? 0} borderColor="#2e8540" icon={<CheckCircle size={18} />} />
        <KpiCard label="Valid SMART JSON" value={summaryData?.well_known_valid_doc ?? 0} borderColor="#2e8540" icon={<FileJson size={18} />} />
        <KpiCard label="Invalid SMART JSON" value={summaryData?.well_known_invalid_doc ?? 0} borderColor="#e31c3d" icon={<XCircle size={18} />} />
      </div>

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter SMART endpoints"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
              FHIR Version
            </label>
            <Select
              options={[{ value: '__all__', label: 'All Versions' }, ...(fhirVersions?.map(v => ({ value: v.value, label: v.value })) || [])]}
              value={filters.fhirVersions?.[0] || '__all__'}
              onValueChange={(v: string) => { setFhirVersions(v === '__all__' ? [] : [v]); setPage(1); }}
              placeholder="All Versions"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
              EHR Developer
            </label>
            <Select
              options={[{ value: '__all__', label: 'All Developers' }, ...(vendors?.map(v => ({ value: v.value, label: v.value })) || [])]}
              value={filters.vendor || '__all__'}
              onValueChange={(v: string) => { setVendor(v === '__all__' ? null : v); setPage(1); }}
              placeholder="All Developers"
            />
          </div>
          <div className="flex flex-col gap-2 md:mt-auto">
            <SearchInput
              value={search}
              onChange={(v: string) => { setSearch(v); setPage(1); }}
              placeholder="Search endpoints..."
            />
          </div>
        </div>

        {(filters.vendor || filters.fhirVersions?.length > 0 || search) && (
          <div className="flex justify-end pt-4 mt-4 border-t border-neutral-200">
            <button
              onClick={() => { resetFilters(); setSearch(''); setPage(1); }}
              className="text-sm font-semibold text-neutral-500 hover:text-navy-700 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 self-start">
          <div className="flex justify-between items-center h-[28px]">
            <h3 className="font-semibold text-lg text-navy-900">
              SMART Core Capabilities
            </h3>
          </div>
          <DataTable
            data={summaryData?.capability_counts ?? []}
            columns={capabilityColumns}
            isLoading={isLoadingSummary}
            totalCount={summaryData?.capability_counts.length ?? 0}
            page={1}
            pageSize={100}
            onPageChange={() => { }}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg text-navy-900">
              Endpoints by Well Known URI support
            </h3>
          </div>

          <DataTable
            data={data?.data ?? []}
            columns={columns}
            totalCount={data?.pagination.total_count ?? 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </div>
      </div>

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
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
