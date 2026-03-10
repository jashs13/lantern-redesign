import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchFields, fetchFieldMetrics } from '@/api/fields';
import { fetchFHIRVersions, fetchVendors } from '@/api/filters';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, InfoIcon } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export function CapStatFieldsTab() {
  const { filters, setFhirVersions, setVendor } = useFilters();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  
  // Pagination strictly for UI of Optional fields view like mockup shows
  const [optionalPage, setOptionalPage] = useState(1);
  const optionalPageSize = 10;
  
  const [reqSort, setReqSort] = useState<{key: string, dir: 'asc'|'desc'}>({key: 'count', dir: 'desc'});
  const [optSort, setOptSort] = useState<{key: string, dir: 'asc'|'desc'}>({key: 'count', dir: 'desc'});

  const { data: fhirVersionOptions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ['filters', 'developers'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const { data: fieldMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['fields-metrics'],
    queryFn: fetchFieldMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
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

  const groupedRequired = useMemo(() => {
    if (!fields) return [];
    const grp = fields.filter(f => f.is_required).reduce((acc, field) => {
      if (!acc[field.field_name]) acc[field.field_name] = { field_name: field.field_name, count: 0, versions: [] };
      acc[field.field_name].count += field.count;
      acc[field.field_name].versions.push(field);
      return acc;
    }, {} as Record<string, any>);
    return Object.values(grp).sort((a: any, b: any) => {
      const aVal = a[reqSort.key];
      const bVal = b[reqSort.key];
      if (typeof aVal === 'string') {
          return reqSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return reqSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [fields, reqSort]);

  const groupedOptionalAndExt = useMemo(() => {
    const list: any[] = [];
    if (fields) {
      const optGrps = fields.filter(f => !f.is_required).reduce((acc, field) => {
        if (!acc[field.field_name]) acc[field.field_name] = { field_name: field.field_name, count: 0, versions: [], type: 'Optional' };
        acc[field.field_name].count += field.count;
        acc[field.field_name].versions.push(field);
        return acc;
      }, {} as Record<string, any>);
      list.push(...Object.values(optGrps));
    }
    if (extensions) {
      const extGrps = extensions.reduce((acc, field) => {
        if (!acc[field.field_name]) acc[field.field_name] = { field_name: field.field_name, count: 0, versions: [], type: 'Extension' };
        acc[field.field_name].count += field.count;
        acc[field.field_name].versions.push(field);
        return acc;
      }, {} as Record<string, any>);
      list.push(...Object.values(extGrps));
    }
    return list.sort((a: any, b: any) => {
        const aVal = a[optSort.key];
        const bVal = b[optSort.key];
        if (typeof aVal === 'string') {
            return optSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return optSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [fields, extensions, optSort]);

  // Paginate optional
  const paginatedOptional = groupedOptionalAndExt.slice((optionalPage - 1) * optionalPageSize, optionalPage * optionalPageSize);

  // Mock total endpoint count since it's not directly in this specific API fetch - estimating max inclusion
  const maxEndpoints = groupedRequired.length > 0 ? Math.max(...groupedRequired.map(g => g.count)) : 70000;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 p-5 bg-sky-50 border-l-4 border-l-sky-500 rounded-md shadow-sm mb-6">
        <InfoIcon className="text-sky-600 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-900">
          <strong>What's included?</strong> This tab shows which fields are present in endpoint FHIR Capability Statements. The FHIR specification defines both required and optional fields. High field inclusion indicates better-documented, more interoperable endpoints.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-success">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Required Fields</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
            {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (fieldMetrics?.required_count ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Fields required by FHIR spec</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-primary">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Optional Fields</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (fieldMetrics?.optional_count ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Additional fields observed</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border border-neutral-200">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Avg Fields per CapStat</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (fieldMetrics?.average_per_cap_stat ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Mean across all endpoints</p>
        </article>
        <article className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-l-warning">
          <div className="text-[0.8125rem] text-gray-500 uppercase tracking-widest font-semibold mb-2">Extensions Observed</div>
          <div className="text-3xl font-bold text-navy-900 leading-tight">
             {metricsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (fieldMetrics?.extension_count ?? 'N/A')}
          </div>
          <p className="text-sm text-gray-500 mt-1">Distinct extension URLs</p>
        </article>
      </div>

      {/* Required Fields Section */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200">
        <header className="p-5 border-b flex justify-between items-center flex-wrap gap-4 bg-white">
          <div>
            <h2 className="text-xl font-bold text-navy-900 font-sans">Required Fields</h2>
            <p className="text-gray-500 text-sm mt-1">Fields that the FHIR specification requires in every Capability Statement</p>
          </div>
        </header>
        
        <section
          className="rounded-md bg-white border border-neutral-200 m-5 p-5 shadow-[var(--shadow-sm)] space-y-4"
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search fields..." />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
                FHIR Version
              </label>
              <Select
                value={filters.fhirVersions[0] ?? '__all__'}
                onValueChange={(v) => { setFhirVersions(v === '__all__' ? [] : [v]); setOptionalPage(1); }}
                options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersionOptions.map((o) => ({ value: o.value, label: o.value }))]}
                placeholder="All Versions"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-sans font-bold uppercase" style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}>
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => setReqSort({key: 'field_name', dir: reqSort.key === 'field_name' && reqSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Field Name {reqSort.key === 'field_name' ? (reqSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => setReqSort({key: 'count', dir: reqSort.key === 'count' && reqSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Endpoints Including {reqSort.key === 'count' ? (reqSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 font-semibold w-1/3 cursor-pointer select-none" onClick={() => setReqSort({key: 'count', dir: reqSort.key === 'count' && reqSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Inclusion Rate {reqSort.key === 'count' ? (reqSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={3} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : groupedRequired.map((item, idx) => {
                const pct = maxEndpoints > 0 ? (item.count / maxEndpoints) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-navy-900">{item.field_name}</td>
                    <td className="px-4 py-3 font-bold">{formatNumber(item.count)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 90 ? 'bg-status-green' : pct >= 70 ? 'bg-sky-500' : pct >= 10 ? 'bg-status-gold' : 'bg-status-red'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-bold text-navy-900 min-w-[45px] text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Optional Fields Section */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200">
         <header className="p-5 border-b bg-white">
          <h2 className="text-xl font-bold text-navy-900 font-sans">Optional Fields & Extensions</h2>
          <p className="text-gray-500 text-sm mt-1">Additional fields and extensions endpoints choose to include</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => setOptSort({key: 'field_name', dir: optSort.key === 'field_name' && optSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Field / Extension {optSort.key === 'field_name' ? (optSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => setOptSort({key: 'type', dir: optSort.key === 'type' && optSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Type {optSort.key === 'type' ? (optSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => setOptSort({key: 'count', dir: optSort.key === 'count' && optSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Endpoints Including {optSort.key === 'count' ? (optSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 font-semibold w-1/3 cursor-pointer select-none" onClick={() => setOptSort({key: 'count', dir: optSort.key === 'count' && optSort.dir === 'asc' ? 'desc' : 'asc'})}>
                    Inclusion Rate {optSort.key === 'count' ? (optSort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y relative">
              {isLoading || extensionsLoading ? (
                <tr><td colSpan={4} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : (
                paginatedOptional.map((item, idx) => {
                  const pct = maxEndpoints > 0 ? (item.count / maxEndpoints) * 100 : 0;
                  const barColor = pct >= 90 ? 'bg-status-green' : pct >= 70 ? 'bg-sky-500' : pct >= 10 ? 'bg-status-gold' : 'bg-status-red';
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-navy-900">{item.field_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.type === 'Extension' ? 'purple' : 'info'}>{item.type}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold">{formatNumber(item.count)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-bold text-navy-900 min-w-[45px] text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && !extensionsLoading && groupedOptionalAndExt.length > 0 && (
           <Pagination
             page={optionalPage}
             totalPages={Math.ceil(groupedOptionalAndExt.length / optionalPageSize)}
             onPageChange={setOptionalPage}
             totalCount={groupedOptionalAndExt.length}
             pageSize={optionalPageSize}
           />
        )}
      </section>
    </div>
  );
}
