import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchValidationsSummary, fetchValidationsDetails, fetchValidationsFailures } from '@/api/validations';
import { fetchFHIRVersions, fetchVendors, fetchValidationGroups } from '@/api/filters';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';

import { ruleDescriptions } from './ruleDescriptions';
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
import { InfoIcon, CheckCircle, XCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ValidationFailure } from '@/api/types';

const failuresColumns: ColumnDef<ValidationFailure, unknown>[] = [
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
    cell: ({ getValue }) => (
      <div className="min-w-0 max-w-[200px]">
        <p className="truncate font-mono text-sm text-neutral-800">
          {getValue() as string}
        </p>
      </div>
    ),
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

export default function ValidationsPage() {
  const { filters, setFhirVersions } = useFilters();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [failuresPage, setFailuresPage] = useState(1);
  const failuresPageSize = 10;

  const [vendor, setVendor] = useState<string | null>(null);
  const [validationGroup, setValidationGroup] = useState<string | null>(null);

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const { data: validationGroupOptions = [] } = useQuery({
    queryKey: ['filters', 'validation-groups'],
    queryFn: fetchValidationGroups,
    staleTime: 10 * 60 * 1000,
  });

  const filterParams = {
    fhir_versions: filters.fhirVersions,
    vendor: vendor || undefined,
    validation_group: validationGroup || undefined,
  };

  // 1. Fetch Summary Data for Chart
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['validations-summary', filterParams],
    queryFn: () => fetchValidationsSummary(filterParams),
  });

  // 2. Fetch Rules Details (for the left list)
  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ['validations-details', filterParams],
    queryFn: () => fetchValidationsDetails(filterParams),
  });

  // Default selection to the first rule once loaded
  if (detailsData && detailsData.length > 0 && !selectedRule) {
    setSelectedRule(detailsData[0].rule_name);
  }

  // 3. Fetch Failures for selected rule
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
    enabled: !!selectedRule,
  });

  const isLoading = isSummaryLoading || isDetailsLoading;

  if (isLoading) return <LoadingState />;
  if (summaryError || detailsError)
    return (
      <ErrorState
        message={(summaryError || detailsError)?.message || 'Failed to load validations'}
      />
    );
  // Sort summary data so the chart looks nice
  const chartData = summaryData ? [...summaryData].sort((a, b) => b.valid + b.invalid - (a.valid + a.invalid)) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validations"
        subtitle="Validation rule results across FHIR endpoints"
        breadcrumbs={[{ label: 'Validations' }]}
      />

      <div className="rounded-md border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900 shadow-sm">
        <div className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div className="flex flex-col gap-2">
            <p>
              For information about the validation rules that Lantern evaluates, including their
              descriptions and references, please see the{' '}
              <a
                href="Lantern Validation Rules and Descriptions.pdf"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sky-700 underline hover:text-sky-800"
              >
                documentation available here
              </a>
              .
            </p>
            <p>
              The ONC Final Rule requires endpoints to support FHIR version 4.0.1, but we have
              included all endpoints for reference.
            </p>
          </div>
        </div>
      </div>

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white border border-neutral-200"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Filter validations"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
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
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
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
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
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

      {/* Chart Section */}
      <section className="rounded-md bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-6 text-lg font-bold text-navy-900">Validation Results Count</h2>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" />
              <YAxis
                dataKey="rule_name"
                type="category"
                tick={{ fontSize: 12, fill: '#4B5563' }}
                width={140}
              />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="valid" name="Success" stackId="a" fill="#22C55E" maxBarSize={40} />
              <Bar dataKey="invalid" name="Failure" stackId="a" fill="#EF4444" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Details Section */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Col: Rules List */}
        <div className="flex flex-col rounded-md bg-white shadow-[var(--shadow-sm)] lg:col-span-4 xl:col-span-3">
          <div className="border-b border-neutral-100 p-4">
            <h3 className="text-base font-bold text-navy-900">Validation Rules</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Click on a rule below to filter the failures table.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '600px' }}>
            <ul className="divide-y divide-neutral-100">
              {detailsData?.map((rule, idx) => {
                const isSelected = selectedRule === rule.rule_name;
                return (
                  <li key={rule.rule_name}>
                    <button
                      onClick={() => {
                        setSelectedRule(rule.rule_name);
                        setFailuresPage(1);
                      }}
                      className={`w-full p-4 text-left transition-colors hover:bg-neutral-50 ${isSelected ? 'bg-sky-50 outline-none ring-2 ring-inset ring-sky-500' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-xs font-semibold text-neutral-400">
                          {idx + 1}.
                        </span>
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-navy-900">{rule.rule_name}</span>
                          <span className="text-xs text-neutral-500">
                            <strong>Versions:</strong> {rule.fhir_version || 'All'}
                          </span>
                          <p className="text-xs leading-relaxed text-neutral-600">
                            <strong>Comment:</strong>{' '}
                            {ruleDescriptions[rule.rule_name] || 'No description available.'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Col: Failures Table */}
        <div className="flex flex-col rounded-md bg-white p-6 shadow-[var(--shadow-sm)] lg:col-span-8 xl:col-span-9 w-full overflow-hidden">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-navy-900">Validation Failure Details</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Rule:{' '}
              <span className="font-semibold text-navy-700">
                {selectedRule || 'Select a rule'}
              </span>
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

          <div className="mt-4 flex items-start gap-2 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
            <InfoIcon className="h-4 w-4 shrink-0 text-neutral-400" />
            <p>
              A green check icon indicates that an endpoint has successfully returned a Conformance
              Resource/Capability Statement. A red X icon indicates the endpoint did not return a
              Conformance Resource/Capability Statement.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
