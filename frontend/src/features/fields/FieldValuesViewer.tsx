import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchFieldValues, fetchFieldValueSummary } from '@/api/fields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { X } from 'lucide-react';
import type { FieldValue } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';
import { formatNumber } from '@/lib/formatters';

interface FieldValuesViewerProps {
    fieldName: string;
    onClose: () => void;
}

const COLORS = ['#02bfe7', '#e5e7eb']; // Lantern Blue for Yes, Light Gray for No

const columns: ColumnDef<FieldValue, unknown>[] = [
    {
        accessorKey: 'field_value',
        header: 'Field Value',
        cell: ({ getValue }) => (
            <span className="font-medium text-navy-700 break-all">{getValue() as string}</span>
        ),
    },
    {
        accessorKey: 'fhir_version',
        header: 'FHIR Version',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
        accessorKey: 'endpoint_count',
        header: 'Endpoints',
        cell: ({ getValue }) => (
            <span className="font-semibold">{formatNumber(getValue() as number)}</span>
        ),
    },
];

export function FieldValuesViewer({ fieldName, onClose }: FieldValuesViewerProps) {
    const { filters } = useFilters();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search);

    // Reset page when field or filters change
    // React components shouldn't typically have state derived from props like this in strict mode, 
    // but for simplicity we rely on the query invalidation.

    // Fetch Values Pagination Data
    const { data: valuesData, isLoading: valuesLoading, error: valuesError } = useQuery({
        queryKey: ['fieldValues', fieldName, page, pageSize, filters.fhirVersions, filters.vendor, debouncedSearch],
        queryFn: () =>
            fetchFieldValues({
                field: fieldName,
                page,
                page_size: pageSize,
                fhir_versions: filters.fhirVersions,
                vendor: filters.vendor || undefined,
                search: debouncedSearch || undefined,
            }),
    });

    // Fetch Summary for Pie Chart
    const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
        queryKey: ['fieldValueSummary', fieldName, filters.fhirVersions, filters.vendor],
        queryFn: () =>
            fetchFieldValueSummary({
                field: fieldName,
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

    return (
        <Card className="shadow-lg border-primary/20 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <CardHeader className="bg-gray-50/80 sticky top-0 z-20 backdrop-blur-sm border-b flex flex-row items-center justify-between py-4">
                <div>
                    <CardTitle className="text-xl text-primary font-semibold flex items-center gap-2">
                        Values for <span className="font-mono bg-white px-2 py-1 rounded border text-sm">{fieldName}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Endpoints satisfying filters for this field</p>
                </div>
                <button className="p-2 rounded hover:bg-gray-100 text-gray-500 transition-colors" onClick={onClose} aria-label="Close pane">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {(summaryError || valuesError) ? (
                    <ErrorState message={(summaryError || valuesError)?.message || 'Failed to load values data'} />
                ) : (
                    <>
                        {/* Pie Chart Section */}
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Endpoints Usage</h3>
                            {summaryLoading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                </div>
                            ) : hasChartData ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
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
                                                    <span className="text-gray-700 font-medium">
                                                        {value}: {formatNumber(entry.payload?.value || 0)}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    No usage data available for this field.
                                </div>
                            )}
                        </div>

                        {/* Values Table Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Distinct Values</h3>
                                <div className="w-64">
                                    <SearchInput value={search} onChange={setSearch} placeholder="Search values..." />
                                </div>
                            </div>

                            <div className="border rounded-lg bg-white overflow-hidden">
                                <DataTable
                                    data={valuesData?.data ?? []}
                                    columns={columns}
                                    totalCount={valuesData?.pagination.total_count ?? 0}
                                    page={page}
                                    pageSize={pageSize}
                                    onPageChange={setPage}
                                    isLoading={valuesLoading}
                                />
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
