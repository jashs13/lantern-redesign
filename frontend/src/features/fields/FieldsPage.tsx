import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchFields } from '@/api/fields';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, ChevronRight } from 'lucide-react';
import { FieldValuesViewer } from './FieldValuesViewer';

export default function FieldsPage() {
  const { filters, setFhirVersions, setVendor } = useFilters();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [selectedField, setSelectedField] = useState<string | null>(null);

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

  const { data: fields, isLoading, error, refetch } = useQuery({
    queryKey: ['fields', filters.fhirVersions, filters.vendor, debouncedSearch],
    queryFn: () =>
      fetchFields({
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        search: debouncedSearch || undefined,
        is_extension: false,
      }),
  });

  const { data: extensions, isLoading: extensionsLoading, error: extensionsError } = useQuery({
    queryKey: ['extensions', filters.fhirVersions, filters.vendor, debouncedSearch],
    queryFn: () =>
      fetchFields({
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        search: debouncedSearch || undefined,
        is_extension: true,
      }),
  });

  if (error || extensionsError) return <ErrorState message={(error || extensionsError)?.message || 'An error occurred'} onRetry={() => refetch()} />;

  const groupedFields = useMemo(() => {
    if (!fields) return [];
    const grp = fields.reduce((acc, field) => {
      if (!acc[field.field_name]) {
        acc[field.field_name] = {
          field_name: field.field_name,
          is_required: field.is_required,
          count: 0,
          versions: []
        };
      }
      acc[field.field_name].count += field.count;
      acc[field.field_name].versions.push(field);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grp).sort((a, b) => {
      if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
      return a.field_name.localeCompare(b.field_name);
    });
  }, [fields]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fields & Values"
        subtitle="View FHIR capability statement fields, their values, and usage across endpoints"
        breadcrumbs={[{ label: 'Fields' }]}
      />

      {/* Filter controls */}
      <section className="rounded-md bg-white p-4 shadow-sm border space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search fields..." />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase text-[0.8125rem] text-gray-500 tracking-wide">
              FHIR Version
            </label>
            <Select
              value={filters.fhirVersions[0] ?? '__all__'}
              onValueChange={(v) => setFhirVersions(v === '__all__' ? [] : [v])}
              options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersionOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Versions"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans font-bold uppercase text-[0.8125rem] text-gray-500 tracking-wide">
              EHR Developer
            </label>
            <Select
              value={filters.vendor ?? '__all__'}
              onValueChange={(v) => setVendor(v === '__all__' ? null : v)}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendorOptions.map((o) => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: Fields List */}
        <div className={`flex-col space-y-4 transition-all duration-300 w-full ${selectedField ? 'lg:w-1/3' : ''}`}>

          <div className="text-sm text-gray-500 italic pl-1 mb-1">
            Click any row to view its unique values and endpoint usage.
          </div>

          <div className="bg-white rounded-lg border shadow-sm flex-grow overflow-hidden flex flex-col mb-4">
            <div className="overflow-auto max-h-[800px]">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 bg-gray-50 uppercase sticky top-0 z-10 shadow-sm border-b">
                  <tr>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">FHIR Version</th>
                    {!selectedField && <th className="px-4 py-3">Requirement</th>}
                    <th className="px-4 py-3 text-right">Endpoints</th>
                  </tr>
                </thead>
                <tbody className="divide-y relative">
                  {isLoading ? (
                    <tr>
                      <td colSpan={selectedField ? 3 : 4} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : groupedFields?.length === 0 ? (
                    <tr>
                      <td colSpan={selectedField ? 3 : 4} className="h-32 text-center text-gray-500">
                        No fields found.
                      </td>
                    </tr>
                  ) : (
                    groupedFields?.map((group, idx) => {
                      const isSelected = selectedField === group.field_name;
                      const isMultiple = group.versions.length > 1;

                      return (
                        <React.Fragment key={`group-${group.field_name}-${idx}`}>
                          <tr
                            onClick={() => setSelectedField(isSelected ? null : group.field_name)}
                            className={`cursor-pointer transition-colors hover:bg-gray-50 group-row border-b last:border-b-0 ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                              }`}
                          >
                            <td className="px-4 py-3 font-medium text-navy-700 break-all">{group.field_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isMultiple ? (
                                <Badge variant="fhir">Multiple</Badge>
                              ) : (
                                <Badge variant={group.versions[0].fhir_version?.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>
                                  {group.versions[0].fhir_version || '—'}
                                </Badge>
                              )}
                            </td>
                            {!selectedField && (
                              <td className="px-4 py-3">
                                {group.is_required ? (
                                  <Badge variant="success">Required</Badge>
                                ) : (
                                  <Badge variant="default">Optional</Badge>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end items-center gap-3">
                                <span className="font-semibold text-neutral-700">{formatNumber(group.count)}</span>
                                <ChevronRight className={`w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100 text-primary rotate-90' : ''}`} />
                              </div>
                            </td>
                          </tr>
                          {isSelected && isMultiple && group.versions.map((ver: any, vIdx: number) => (
                            <tr key={`child-${group.field_name}-${ver.fhir_version}-${vIdx}`} className="bg-gray-50/50 border-b border-l-2 border-l-primary text-sm">
                              <td className="px-4 py-2 pl-8 text-gray-600 break-all flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                {ver.field_name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <Badge variant={ver.fhir_version?.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>
                                  {ver.fhir_version || '—'}
                                </Badge>
                              </td>
                              {!selectedField && <td></td>}
                              <td className="px-4 py-2 text-right text-gray-600 pr-11">
                                {formatNumber(ver.count)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">CapabilityStatement Extensions</h3>
          <div className="bg-white rounded-lg border shadow-sm flex-grow overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[800px]">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 bg-gray-50 uppercase sticky top-0 z-10 shadow-sm border-b">
                  <tr>
                    <th className="px-4 py-3">Extension Field</th>
                    <th className="px-4 py-3">FHIR Version</th>
                    {!selectedField && <th className="px-4 py-3">Requirement</th>}
                    <th className="px-4 py-3 text-right">Endpoints</th>
                  </tr>
                </thead>
                <tbody className="divide-y relative">
                  {extensionsLoading ? (
                    <tr>
                      <td colSpan={selectedField ? 3 : 4} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : extensions?.length === 0 ? (
                    <tr>
                      <td colSpan={selectedField ? 3 : 4} className="h-32 text-center text-gray-500">
                        No extensions found.
                      </td>
                    </tr>
                  ) : (
                    extensions?.map((ext, idx) => {
                      return (
                        <tr
                          key={`ext-${ext.field_name}-${ext.fhir_version}-${idx}`}
                          className="border-b last:border-b-0 border-l-2 border-l-transparent"
                        >
                          <td className="px-4 py-3 font-medium text-navy-700 break-all">{ext.field_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={ext.fhir_version?.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>
                              {ext.fhir_version || '—'}
                            </Badge>
                          </td>
                          {!selectedField && (
                            <td className="px-4 py-3">
                              {ext.is_required ? (
                                <Badge variant="navy">Required</Badge>
                              ) : (
                                <Badge variant="default">Optional</Badge>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end items-center gap-3">
                              <span className="font-semibold text-neutral-700">{formatNumber(ext.count)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Field Values Viewer */}
        {selectedField && (
          <div className="w-full lg:w-2/3 animate-in fade-in slide-in-from-right-4 duration-300">
            <FieldValuesViewer
              fieldName={selectedField}
              onClose={() => setSelectedField(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
