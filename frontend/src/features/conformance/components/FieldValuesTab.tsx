import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchFieldValues, fetchFieldValueSummary, fetchFieldValueMetrics } from '@/api/fields';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatNumber } from '@/lib/formatters';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, InfoIcon, BarChart3 } from 'lucide-react';
import type { SortingState } from '@tanstack/react-table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DataTable } from '@/components/ui/DataTable';

const COLORS = ['#02bfe7', '#e5e7eb'];



export function FieldValuesTab() {
  const { filters } = useFilters();
  const [selectedField, setSelectedField] = useState('url');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sorting, setSorting] = useState<SortingState>([{ id: 'endpoint_count', desc: true }]);

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['fieldValuesMetrics'],
    queryFn: fetchFieldValueMetrics,
    staleTime: 5 * 60 * 1000,
  });

  const { data: valuesData, isLoading: valuesLoading, error: valuesError } = useQuery({
    queryKey: ['fieldValues', selectedField, page, pageSize, filters.fhirVersions, filters.vendor, debouncedSearch],
    queryFn: () =>
      fetchFieldValues({
        field: selectedField,
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['fieldValueSummary', selectedField, filters.fhirVersions, filters.vendor],
    queryFn: () =>
      fetchFieldValueSummary({
        field: selectedField,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
      }),
  });

  const chartData = summaryData
    ? [
        { name: 'Includes Value', value: summaryData.find((s) => s.is_used === 'yes')?.count || 0 },
        { name: 'Missing Value', value: summaryData.find((s) => s.is_used === 'no')?.count || 0 },
      ]
    : [];

  const hasChartData = chartData.some((d) => d.value > 0);
  const totalEndpointsWithValue = chartData.find(c => c.name === 'Includes Value')?.value || 0;

  const tableColumns = useMemo(() => {
    return [
      {
        accessorKey: 'field_value',
        header: 'Value',
        cell: ({ getValue }: any) => (
          <span className="font-bold font-mono text-navy-900 break-all">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'endpoint_count',
        header: 'Endpoints',
        cell: ({ getValue }: any) => (
          <span className="font-bold">{formatNumber(getValue() as number)}</span>
        ),
      },
      {
          id: 'percentage',
          header: 'Percentage',
          cell: ({ row }: any) => {
              const val = row.original.endpoint_count as number;
              const pct = totalEndpointsWithValue > 0 ? (val / totalEndpointsWithValue) * 100 : 0;
              const barColor = pct >= 90 ? 'bg-status-green' : pct >= 70 ? 'bg-sky-500' : pct >= 10 ? 'bg-status-gold' : 'bg-status-red';
              return (
                  <div className="flex items-center gap-2 max-w-[200px]">
                      <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-semibold text-navy-900 min-w-[45px] text-right">{pct.toFixed(1)}%</span>
                  </div>
              );
          }
      }
    ];
  }, [totalEndpointsWithValue]);

  const sortedData = useMemo(() => {
    if (!valuesData?.data) return [];
    return [...valuesData.data].sort((a: any, b: any) => {
       if (sorting.length === 0) return 0;
       const { id, desc } = sorting[0];
       let aVal = a[id];
       let bVal = b[id];
       if (id === 'percentage') {
           aVal = a['endpoint_count'];
           bVal = b['endpoint_count'];
       }
       if (typeof aVal === 'string') {
           return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
       }
       return desc ? bVal - aVal : aVal - bVal;
    });
  }, [valuesData?.data, sorting]);

  if (valuesError || summaryError) return <ErrorState message={(valuesError || summaryError)?.message || 'Failed to load values'} />;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 p-5 bg-sky-50 border-l-4 border-l-sky-500 rounded-md shadow-sm mb-6">
        <InfoIcon className="text-sky-600 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-900">
          <strong>About field values:</strong> Select a Capability Statement field to see the set of values endpoints actually populate for that field. This helps identify common patterns, unexpected values, and areas where endpoints deviate from the specification.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-primary">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Fields with Values</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
            {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (metricsData?.fields_with_values !== null && metricsData?.fields_with_values !== undefined ? formatNumber(metricsData.fields_with_values) : 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Distinct fields with observable values</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-success">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Unique Values</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
            {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (metricsData?.total_unique_values !== null && metricsData?.total_unique_values !== undefined ? formatNumber(metricsData.total_unique_values) : 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Distinct values across all fields</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border border-neutral-200">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Most Uniform</div>
          <div className="text-xl font-bold text-navy-900 font-mono mt-1 mb-2">
            {metricsLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (metricsData?.most_uniform_field ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {metricsLoading ? <span className="opacity-0">Loading...</span> : (metricsData?.most_uniform_score !== null && metricsData?.most_uniform_score !== undefined ? `${metricsData.most_uniform_score.toFixed(1)}% report top value` : 'N/A')}
          </p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-warning">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Most Varied</div>
          <div className="text-xl font-bold text-navy-900 font-mono mt-1 mb-2">
            {metricsLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (metricsData?.most_varied_field ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {metricsLoading ? <span className="opacity-0">Loading...</span> : (metricsData?.most_varied_score !== null && metricsData?.most_varied_score !== undefined ? `${formatNumber(metricsData.most_varied_score)} distinct values` : 'N/A')}
          </p>
        </article>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <header className="p-5 border-b bg-white">
          <h2 className="text-xl font-bold text-navy-900 font-sans">Field Value Explorer</h2>
          <p className="text-gray-500 text-sm mt-1">Select a field to see the values reported by endpoints</p>
        </header>

        <section
          className="rounded-md bg-white border border-neutral-200 m-5"
          style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
                Field Name
              </label>
              <Select
                value={selectedField}
                onValueChange={(v) => { setSelectedField(v); setPage(1); }}
                options={[
                    { value: 'url', label: 'url' },
                    { value: 'fhirVersion', label: 'fhirVersion' },
                    { value: 'name', label: 'name' },
                    { value: 'title', label: 'title' },
                    { value: 'date', label: 'date' },
                    { value: 'publisher', label: 'publisher' },
                    { value: 'description', label: 'description' },
                    { value: 'purpose', label: 'purpose' },
                    { value: 'copyright', label: 'copyright' },
                    { value: 'software.name', label: 'software.name' },
                    { value: 'software.version', label: 'software.version' },
                    { value: 'software.releaseDate', label: 'software.releaseDate' },
                    { value: 'implementation.description', label: 'implementation.description' },
                    { value: 'implementation.url', label: 'implementation.url' },
                    { value: 'implementation.custodian', label: 'implementation.custodian' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
                Search Values
              </label>
              <SearchInput value={search} onChange={setSearch} placeholder="Search within values..." />
            </div>
          </div>
        </section>

        <div className="p-5 border-b border-gray-100">
            <h3 className="font-sans text-lg font-bold text-navy-900 border-b-2 border-primary inline-block pb-1 mb-2">
                Values for: CapabilityStatement.{selectedField}
            </h3>
            <p className="text-sm text-gray-500">
                {valuesData?.pagination.total_count || 0} distinct values observed across {formatNumber(totalEndpointsWithValue)} endpoints that include this field
            </p>
        </div>

        <DataTable
            data={sortedData}
            columns={tableColumns}
            totalCount={valuesData?.pagination.total_count ?? 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            isLoading={valuesLoading}
            sorting={sorting}
            onSortingChange={setSorting}
        />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <header className="p-5 border-b bg-white">
            <h2 className="text-xl font-bold text-navy-900 font-sans">Value Distribution</h2>
            <p className="text-gray-500 text-sm mt-1">Visual breakdown of endpoints including the field vs missing it</p>
          </header>
          
          <div className="p-5">
              {summaryLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                ) : hasChartData ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [formatNumber(value), 'Endpoints']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => (
                                        <span className="text-gray-700 font-medium ml-1">
                                            {value}: {formatNumber(entry.payload?.value || 0)}
                                        </span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 bg-slate-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-500">
                        <BarChart3 className="w-10 h-10 mb-2 opacity-50" />
                        <div className="font-semibold text-gray-600">No usage data available</div>
                    </div>
                )}
          </div>
      </section>
    </div>
  );
}
