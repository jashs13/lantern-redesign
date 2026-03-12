import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchValidationsSummary, fetchValidationsDetails, fetchValidationsFailures, fetchValidationMetrics } from '@/api/validations';
import { fetchFHIRVersions, fetchValidationGroups, fetchVendors } from '@/api/filters';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ruleDescriptions } from '@/features/validations/ruleDescriptions';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { InfoIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { EndpointDetailModal } from '@/features/endpoints/EndpointDetailModal';
import type { ColumnDef } from '@tanstack/react-table';
import type { ValidationFailure, ValidationMetrics } from '@/api/types';
import { formatNumber } from '@/lib/formatters';

function buildFailuresColumns(
  onOpenDetail: (url: string) => void
): ColumnDef<ValidationFailure, unknown>[] {
  return [
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      if (!ver) return '—';
      const isMissing = ver === 'No Cap Stat';
      return (
        <div className="flex items-center gap-2 px-1">
          {isMissing ? (
            <XCircle className="h-4 w-4 shrink-0 text-status-red" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 text-status-green" />
          )}
          <Badge className="whitespace-nowrap" variant={ver.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>{ver}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'url',
    header: 'Endpoint URL',
    size: 200,
    cell: ({ getValue }) => {
      const url = getValue() as string;
      return (
        <div className="min-w-0 max-w-[200px]">
          <button
            type="button"
            className="truncate block w-full text-left font-mono text-xs text-neutral-800 hover:text-navy-700 hover:underline"
            onClick={() => onOpenDetail(url)}
          >
            {url}
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: 'expected',
    header: 'Expected Value',
    cell: ({ getValue }) => (
      <span className="text-sm text-neutral-600">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'actual',
    header: 'Actual Value',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-neutral-800">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'vendor_name',
    header: 'Developer',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <Badge variant="navy" className="whitespace-nowrap">
          {vendor}
        </Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  ];
}

export function ValidationResultsTab() {
  const { filters, setFhirVersions } = useFilters();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [failuresPage, setFailuresPage] = useState(1);
  const failuresPageSize = 10;
  const [search, setSearch] = useState('');

  const [validationGroup, setValidationGroup] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [selectedEndpointUrl, setSelectedEndpointUrl] = useState<string | null>(null);

  const failuresColumns = buildFailuresColumns((url) => setSelectedEndpointUrl(url));

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });



  const { data: validationGroupOptions = [] } = useQuery({
    queryKey: ['filters', 'validation-groups'],
    queryFn: fetchValidationGroups,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'developers'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const filterParams = {
    fhir_versions: filters.fhirVersions,
    validation_group: validationGroup || undefined,
    vendor: vendor || undefined,
  };

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['validations-summary', filterParams],
    queryFn: () => fetchValidationsSummary(filterParams),
    placeholderData: keepPreviousData,
  });

  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ['validations-details', filterParams],
    queryFn: () => fetchValidationsDetails(filterParams),
    placeholderData: keepPreviousData,
  });

  if (detailsData && detailsData.length > 0 && !selectedRule) {
    setSelectedRule(detailsData[0].rule_name);
  }

  const {
    data: failuresData,
    isLoading: isFailuresLoading,
    error: failuresError,
  } = useQuery({
    queryKey: ['validations-failures', selectedRule, failuresPage, filterParams],
    queryFn: () =>
      fetchValidationsFailures({
        ...filterParams,
        rule_name: selectedRule!,
        page: failuresPage,
        page_size: failuresPageSize,
      }),
    placeholderData: keepPreviousData,
    enabled: !!selectedRule,
  });

  const {
    data: metricsData,
    isLoading: isMetricsLoading,
  } = useQuery<ValidationMetrics>({
    queryKey: ['validations-metrics'],
    queryFn: fetchValidationMetrics,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isSummaryLoading || isDetailsLoading;

  if (isLoading) return <LoadingState />;
  if (summaryError || detailsError)
    return <ErrorState message={(summaryError || detailsError)?.message || 'Failed to load validations'} />;
    
  const chartData = summaryData ? [...summaryData].sort((a, b) => b.valid + b.invalid - (a.valid + a.invalid)) : [];

  const filteredRules = detailsData?.filter(rule => 
      rule.rule_name.toLowerCase().includes(search.toLowerCase()) || 
      (ruleDescriptions[rule.rule_name] || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4 p-5 bg-status-gold-bg border-l-4 border-l-status-gold rounded-md shadow-sm mb-6">
        <InfoIcon className="text-yellow-800 mt-0.5 shrink-0" />
        <div className="text-sm text-navy-900">
          <strong>About validations:</strong> Lantern evaluates endpoint capability statements against a set of validation rules derived from the FHIR specification and ONC requirements. The ONC Final Rule requires endpoints to support FHIR version 4.0.1, but all endpoints are included here for reference.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-success">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Passing All Rules</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {isMetricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (metricsData?.passing_all !== null && metricsData?.passing_all !== undefined ? formatNumber(metricsData.passing_all) : 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">
             {isMetricsLoading ? <span className="opacity-0">Loading...</span> : (metricsData?.pass_rate !== null && metricsData?.pass_rate !== undefined ? `${metricsData.pass_rate}% of endpoints pass all` : 'N/A')}
          </p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-destructive">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">With Failures</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {isMetricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (metricsData?.with_failures !== null && metricsData?.with_failures !== undefined ? formatNumber(metricsData.with_failures) : 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">
             {isMetricsLoading ? <span className="opacity-0">Loading...</span> : (metricsData?.pass_rate !== null && metricsData?.pass_rate !== undefined ? `${(100 - metricsData.pass_rate).toFixed(1)}% have ≥1 failure` : 'N/A')}
          </p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-primary">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Validation Rules</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {isMetricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (metricsData?.total_rules !== null && metricsData?.total_rules !== undefined ? formatNumber(metricsData.total_rules) : 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Rules evaluated per endpoint</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-warning">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Most Failed Rule</div>
          <div className="text-xl font-bold text-navy-900 font-mono mt-1 mb-2">
             {isMetricsLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (metricsData?.most_failed_rule ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">
             {isMetricsLoading ? <span className="opacity-0">Loading...</span> : (metricsData?.max_failures !== null && metricsData?.max_failures !== undefined ? `${formatNumber(metricsData.max_failures)} endpoints affected` : 'N/A')}
          </p>
        </article>
      </div>

      {/* Filters Section */}
      <section
        className="rounded-md bg-white border border-neutral-200 mb-6 mt-4"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
              FHIR Version
            </label>
            <Select
              value={filters.fhirVersions[0] ?? '__all__'}
              onValueChange={(v) => { setFhirVersions(v === '__all__' ? [] : [v]); setFailuresPage(1); }}
              options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersionOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Versions"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
              EHR Developer
            </label>
            <Select
              value={vendor ?? '__all__'}
              onValueChange={(v) => { setVendor(v === '__all__' ? null : v); setFailuresPage(1); }}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendorOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
              Validation Group
            </label>
            <Select
              value={validationGroup ?? '__all__'}
              onValueChange={(v) => { setValidationGroup(v === '__all__' ? null : v); setFailuresPage(1); }}
              options={[{ value: '__all__', label: 'All Groups' }, ...validationGroupOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Groups"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <header className="p-5 border-b bg-white flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy-900 font-sans">Validation Results Summary</h2>
            <p className="text-gray-500 text-sm mt-1">Pass/fail rates across all validation rules</p>
          </div>
        </header>

        <div className="p-6 pb-2">
            <div className="w-full" style={{ height: Math.max(400, chartData.length * 35) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" />
                  <YAxis dataKey="rule_name" type="category" tick={{ fontSize: 12, fill: '#4B5563' }} width={180} interval={0} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="valid" name="Success" stackId="a" fill="#2e8540" maxBarSize={30} />
                  <Bar dataKey="invalid" name="Failure" stackId="a" fill="#e31c3d" maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>
        <div className="px-6 pb-6">
            <div className="text-[0.875rem] text-gray-600 bg-blue-50/50 border border-blue-100/60 rounded-md p-4 shadow-sm">
                <span className="font-bold text-navy-900 pr-1">Note:</span>
                The <code className="bg-white/80 border border-blue-200 px-1 py-0.5 rounded text-xs">messagingEndptRule</code> is not broken, there is an issue with the Capability Statement invariant (cpb-3). The invariant states that the Messaging endpoint has to be present when the kind is 'instance', and Messaging endpoint cannot be present when kind is NOT 'instance', but the FHIRPath expression is <code>messaging.endpoint.empty() or kind = 'instance'</code>, which is not consistent with the expectation for the invariant and will not properly evaluate the conditions required.
            </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <header className="p-5 border-b bg-white">
            <h2 className="text-xl font-bold text-navy-900 font-sans">Validation Rules</h2>
            <p className="text-gray-500 text-sm mt-1">Click a rule to see detailed failure information in the table below</p>
        </header>
        
        <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
             <div className="flex-1 min-w-[250px]">
                 <SearchInput value={search} onChange={setSearch} placeholder="Search rules by name or description..." />
             </div>
        </div>

        <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRules?.map((rule) => {
                    const isSelected = selectedRule === rule.rule_name;
                    const stats = chartData.find(c => c.rule_name === rule.rule_name);
                    const validCount = stats?.valid || 0;
                    const invalidCount = stats?.invalid || 0;
                    const total = validCount + invalidCount;
                    const rulePassRate = total > 0 ? ((validCount / total) * 100).toFixed(1) : 0;
                    
                    return (
                        <article 
                            key={rule.rule_name}
                            onClick={() => { setSelectedRule(rule.rule_name); setFailuresPage(1); }}
                            className={`border rounded-lg p-5 cursor-pointer transition-all duration-200 group
                                ${isSelected ? 'border-primary ring-1 ring-primary shadow-md bg-sky-50/20' : 'border-neutral-200 hover:border-primary-light hover:shadow-md'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`font-mono font-bold text-[0.9375rem] ${isSelected ? 'text-primary' : 'text-navy-900 group-hover:text-primary-dark'}`}>
                                    {rule.rule_name}
                                </span>
                                <Badge variant={Number(rulePassRate) > 90 ? 'success' : Number(rulePassRate) > 50 ? 'warning' : 'error'}>
                                    {rulePassRate}% pass
                                </Badge>
                            </div>
                            <div className="text-[0.875rem] text-gray-600 mb-4 line-clamp-3 min-h-[60px]">
                                {ruleDescriptions[rule.rule_name] || 'No description available for this rule.'}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-lg font-bold text-success leading-tight">{formatNumber(validCount)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Pass</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-lg font-bold text-destructive leading-tight">{formatNumber(invalidCount)}</div>
                                    <div className="text-xs text-gray-500 mt-1">Fail</div>
                                </div>
                            </div>
                        </article>
                    );
                })}
                {filteredRules?.length === 0 && (
                     <div className="col-span-full py-12 text-center text-gray-500">
                         No validation rules found matching your search.
                     </div>
                )}
            </div>
        </div>

        {selectedRule && (
            <div className="border-t border-gray-200 p-5 bg-neutral-50 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-navy-900">Validation Failure Details</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                    Rule: <span className="font-semibold text-navy-700 font-mono">{selectedRule}</span>
                    </p>
                </div>

                {failuresError ? (
                    <ErrorState message={failuresError.message} />
                ) : (
                    <DataTable
                        columns={failuresColumns}
                        data={failuresData?.data || []}
                        totalCount={failuresData?.pagination.total_count || 0}
                        page={failuresPage}
                        pageSize={failuresPageSize}
                        onPageChange={setFailuresPage}
                        isLoading={isFailuresLoading}
                    />
                )}

                <div className="mt-4 flex items-start gap-2 rounded-md bg-white border p-3 text-xs text-neutral-600 shadow-sm">
                    <InfoIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                    <p>
                    A green check icon indicates that an endpoint has successfully returned a Conformance
                    Resource/Capability Statement. A red X icon indicates the endpoint did not return a
                    Conformance Resource/Capability Statement.
                    </p>
                </div>
            </div>
        )}
      </section>

      <EndpointDetailModal
        url={selectedEndpointUrl}
        onClose={() => setSelectedEndpointUrl(null)}
      />
    </div>
  );
}
