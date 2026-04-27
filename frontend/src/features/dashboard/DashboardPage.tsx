import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchDashboardSummary } from '@/api/dashboard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { HTTP_STATUS_COLORS, STATUS_COLORS, NAVY_COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { BarChart } from '@/components/charts/BarChart';


/* ========================================================================== */
/* Inline helper components                                                    */
/* ========================================================================== */

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mt-4">
      <h2 className="shrink-0 font-serif text-lg font-bold text-navy-900">{title}</h2>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-5 flex flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
        {headerRight && (
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ========================================================================== */
/* HTTP code bar color helper                                                  */
/* ========================================================================== */

function httpCodeColor(code: number): string {
  if (code >= 200 && code < 300) return HTTP_STATUS_COLORS['2xx'].color;
  if (code >= 300 && code < 400) return HTTP_STATUS_COLORS['3xx'].color;
  if (code >= 400 && code < 500) return HTTP_STATUS_COLORS['4xx'].color;
  if (code >= 500 && code < 600) return HTTP_STATUS_COLORS['5xx'].color;
  return HTTP_STATUS_COLORS['5xx'].color;
}

/* ========================================================================== */
/* Dashboard Page                                                              */
/* ========================================================================== */

export default function DashboardPage() {
  const { filters } = useFilters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', filters.fhirVersions, filters.vendor],
    queryFn: () =>
      fetchDashboardSummary({
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor ?? undefined,
      }),
  });

  // Availability chart time range toggle
  const [availabilityRange, setAvailabilityRange] = useState<'30' | '90' | '365'>('30');

  // Developer table: search, sort, pagination (all client-side)
  // Hooks must be called before any early returns
  const [devSearch, setDevSearch] = useState('');
  const [devSortCol, setDevSortCol] = useState<string>('endpoint_count');
  const [devSortDir, setDevSortDir] = useState<'asc' | 'desc'>('desc');
  const [devPage, setDevPage] = useState(1);
  const devPageSize = 10;

  const devSummary = data?.dev_summary || [];

  // Monthly endpoint count for the "Total FHIR Endpoints Over the Past Year" chart
  const monthlyEndpointData = useMemo(() => {
    const stats = data?.daily_stats || [];
    const byMonth = new Map<string, { month: string; sum: number; count: number }>();
    stats.forEach((d) => {
      const monthKey = d.stat_date.slice(0, 7); // "YYYY-MM"
      const existing = byMonth.get(monthKey);
      if (existing) {
        existing.sum += d.total_endpoints;
        existing.count += 1;
      } else {
        byMonth.set(monthKey, {
          month: new Date(d.stat_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          sum: d.total_endpoints,
          count: 1,
        });
      }
    });
    return Array.from(byMonth.values()).map(({ month, sum, count }) => ({
      month,
      total_endpoints: Math.round(sum / count),
    }));
  }, [data?.daily_stats]);

  const filteredDevs = useMemo(() => {
    let result = devSummary;

    if (devSearch.trim()) {
      const q = devSearch.toLowerCase();
      result = result.filter((d) => d.vendor_name.toLowerCase().includes(q));
    }

    const sorted = [...result];
    const dir = devSortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      const av = a[devSortCol as keyof typeof a];
      const bv = b[devSortCol as keyof typeof b];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });

    return sorted;
  }, [devSummary, devSearch, devSortCol, devSortDir]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data) return null;

  const totalEndpoints = data.totals.all_endpoints;
  const indexedEndpoints = data.totals.indexed_endpoints;

  // Build HTTP code distribution from data
  const httpCodes = data.http_codes || [];

  // Group into 2xx, 3xx, 4xx, 5xx, other
  const codeGroups: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, timeout: 0 };
  httpCodes.forEach((c) => {
    const code = c.http_code;
    if (code >= 200 && code < 300) codeGroups['2xx'] += c.count_endpoints;
    else if (code >= 300 && code < 400) codeGroups['3xx'] += c.count_endpoints;
    else if (code >= 400 && code < 500) codeGroups['4xx'] += c.count_endpoints;
    else if (code >= 500 && code < 600) codeGroups['5xx'] += c.count_endpoints;
    else codeGroups['timeout'] += c.count_endpoints;
  });

  const availableCount = codeGroups['2xx'];
  const degradedCount = codeGroups['3xx'] + codeGroups['4xx'];
  const downCount = codeGroups['5xx'] + codeGroups['timeout'];

  // Prepare HTTP error/timeout bar chart data
  const errorBarData = httpCodes
    .filter((c) => c.count_endpoints > 0 && (c.http_code < 200 || c.http_code >= 300))
    .sort((a, b) => b.count_endpoints - a.count_endpoints)
    .map((c) => ({
      label: c.http_code === 0 ? '0 Timeout' : `${c.http_code} ${c.code_label || ''}`.trim(),
      count: c.count_endpoints,
      code: c.http_code,
    }));

  // Aggregate vendor_counts by fhir_version for the version chart
  const versionMap = new Map<string, number>();
  (data.vendor_counts || []).forEach((vc) => {
    versionMap.set(vc.fhir_version, (versionMap.get(vc.fhir_version) || 0) + vc.count);
  });
  const fhirVersionData = Array.from(versionMap.entries())
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count);


  // Daily stats for historical trend charts
  const allDailyStats = (data.daily_stats || []).map((d) => {
    const total = d.http_2xx + d.http_3xx + d.http_4xx + d.http_5xx + d.http_timeout;
    return {
      date: d.stat_date.slice(5), // "MM-DD"
      available_pct: d.available_pct,
      avg_response_time_ms: d.avg_response_time_ms,
      pct_2xx: total > 0 ? Math.round(d.http_2xx / total * 1000) / 10 : 0,
      pct_4xx: total > 0 ? Math.round(d.http_4xx / total * 1000) / 10 : 0,
      pct_5xx: total > 0 ? Math.round((d.http_5xx + d.http_timeout) / total * 1000) / 10 : 0,
    };
  });
  const availabilityData = allDailyStats.slice(-Number(availabilityRange));
  const trendData = allDailyStats.slice(-30);

  // Sort column helpers
  function toggleDevSort(col: string) {
    if (devSortCol === col) {
      setDevSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setDevSortCol(col);
      setDevSortDir(col === 'vendor_name' ? 'asc' : 'desc');
    }
    setDevPage(1);
  }

  const sortColToDropdown: Record<string, string> = {
    endpoint_count: 'endpoints',
    vendor_name: 'name',
    org_count: 'organizations',
    available_pct: 'health',
    avg_response_time_ms: 'response_time',
  };
  const dropdownToSortCol: Record<string, { col: string; dir: 'asc' | 'desc' }> = {
    endpoints: { col: 'endpoint_count', dir: 'desc' },
    name: { col: 'vendor_name', dir: 'asc' },
    organizations: { col: 'org_count', dir: 'desc' },
    health: { col: 'available_pct', dir: 'desc' },
    response_time: { col: 'avg_response_time_ms', dir: 'asc' },
  };

  const devTotalPages = Math.max(1, Math.ceil(filteredDevs.length / devPageSize));
  const safePage = Math.min(devPage, devTotalPages);
  const pagedDevs = filteredDevs.slice((safePage - 1) * devPageSize, safePage * devPageSize);

  function exportDevCsv() {
    const headers = ['Developer Name', 'Endpoints', 'Organizations', 'Available %', 'Degraded %', 'Down %', 'Avg Response Time (ms)'];
    const csvField = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredDevs.map((d) =>
      [d.vendor_name, d.endpoint_count, d.org_count, d.available_pct, d.degraded_pct, d.down_pct, d.avg_response_time_ms].map(csvField).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'developer_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FHIR Endpoint Dashboard"
        breadcrumbs={[{ label: 'Dashboard' }]}
      >
        <p className="text-sm text-neutral-600 max-w-4xl">
          <strong>Lantern</strong> monitors nationwide FHIR API endpoints for ONC, tracking the availability and
          standardization of FHIR service base URLs deployed by healthcare organizations.
          It collects data from FHIR Capability Statements to visualize{' '}
          <strong>FHIR adoption</strong> and <strong>patient data availability</strong>.
        </p>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Endpoints"
          value={totalEndpoints}
          borderColor="#205493"
          icon={<Server size={20} />}
        />
        <KpiCard
          label="Indexed Endpoints"
          value={indexedEndpoints}
          borderColor="#02bfe7"
          icon={<Search size={20} />}
        />
        <KpiCard
          label="Available"
          value={availableCount}
          borderColor="#2e8540"
          icon={<CheckCircle size={20} />}
        />
        <KpiCard
          label="Degraded"
          value={degradedCount}
          borderColor="#fdb81e"
          icon={<AlertTriangle size={20} />}
        />
        <KpiCard
          label="Down"
          value={downCount}
          borderColor="#e31c3d"
          icon={<XCircle size={20} />}
        />
        <KpiCard
          label="Last Updated"
          value={data.totals.last_updated ? data.totals.last_updated.slice(0, 10) : 'Today'}
          borderColor="#205493"
          icon={<Clock size={20} />}
          smallValue
        />
      </div>

      <SectionDivider title="Endpoint Trends" />

      {/* Total FHIR Endpoints Over the Past Year */}
      <ChartCard
        title="Total FHIR Endpoints Over the Past Year"
        subtitle="Number of unique FHIR endpoints observed each month"
      >
        <ResponsiveContainer width="100%" height={260}>
          <RechartsBarChart data={monthlyEndpointData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="total_endpoints" name="Total Endpoints" radius={[3, 3, 0, 0]}>
              {monthlyEndpointData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === monthlyEndpointData.length - 1 ? NAVY_COLORS.primary : '#93afd4'}
                />
              ))}
              <LabelList dataKey="total_endpoints" position="top" formatter={(v: number) => formatNumber(v)} style={{ fontSize: 10 }} />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ================================================================== */}
      {/* Section 1: Availability & Performance                               */}
      {/* ================================================================== */}
      <SectionDivider title="Availability & Performance" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={`Endpoint Availability — Last ${availabilityRange === '365' ? '12 Months' : availabilityRange === '90' ? '90 Days' : '30 Days'}`}
          subtitle="Percentage of endpoints returning a successful response each day"
          headerRight={
            <select
              aria-label="Availability chart time range"
              value={availabilityRange}
              onChange={(e) => setAvailabilityRange(e.target.value as '30' | '90' | '365')}
              className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          }
        >
          <TimeSeriesChart
            data={availabilityData}
            xKey="date"
            yKey="available_pct"
            color={STATUS_COLORS.available}
            height={280}
          />
        </ChartCard>

        <ChartCard
          title="Avg Response Time — 30 Days"
          subtitle="Milliseconds (lower is better)"
        >
          <TimeSeriesChart
            data={trendData}
            xKey="date"
            yKey="avg_response_time_ms"
            color={NAVY_COLORS.primary}
            height={280}
          />
        </ChartCard>
      </div>

      {/* ================================================================== */}
      {/* Section 2: Response Codes & FHIR Versions                           */}
      {/* ================================================================== */}
      <SectionDivider title="Response Codes & FHIR Versions" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="HTTP Error & Timeout Distribution"
          subtitle="Non-success response codes from all endpoints"
        >
          <ResponsiveContainer width="100%" height={260}>
            <RechartsBarChart data={errorBarData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Endpoints']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {errorBarData.map((entry) => (
                  <Cell key={entry.label} fill={httpCodeColor(entry.code)} />
                ))}
                <LabelList dataKey="count" position="top" fontSize={12} fontWeight={600} fill="#374151" />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Endpoints by FHIR Version"
          subtitle="Specification version distribution"
        >
          <BarChart
            data={fhirVersionData}
            xKey="version"
            yKey="count"
            color={NAVY_COLORS.primary}
            height={260}
          />
        </ChartCard>
      </div>

      {/* ================================================================== */}
      {/* Section 3: Adoption & Capabilities                                   */}
      {/* ================================================================== */}
      <SectionDivider title="Adoption & Capabilities" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* FHIR Resource Adoption */}
        <ChartCard
          title="FHIR Resource Adoption"
          subtitle="Percentage of endpoints declaring support for each resource"
        >
          <div className="space-y-2">
            {(data.resource_adoption || []).map((r) => (
              <div key={r.resource_type} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-neutral-700">{r.resource_type}</span>
                <div className="flex-1 h-4 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${r.adoption_pct}%`,
                      backgroundColor: r.adoption_pct >= 90 ? '#205493' : r.adoption_pct >= 80 ? '#4773aa' : '#8ba6ca',
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-neutral-700">
                  {r.adoption_pct}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Security & SMART on FHIR Adoption */}
        <ChartCard
          title="Security & SMART on FHIR Adoption"
          subtitle="Percentage of endpoints supporting each capability"
        >
          {(() => {
            const SECURITY_COLORS: Record<string, string> = {
              'TLS 1.2+':       '#2e8540',
              'OAuth 2.0':      '#205493',
              'SMART on FHIR':  '#0095c8',
              'CORS Enabled':   '#4773aa',
              'OpenID Connect': '#8ba6ca',
            };
            const CIRCUMFERENCE = 106.8;
            return (
              <div className="space-y-4">
                {(data.security_adoption || []).map((s) => {
                  const offset = (1 - s.adoption_pct / 100) * CIRCUMFERENCE;
                  const color = SECURITY_COLORS[s.capability_name] ?? '#205493';
                  return (
                    <div key={s.capability_name} className="flex items-center gap-4">
                      <div className="relative shrink-0 w-12 h-12">
                        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                          <circle cx="20" cy="20" r="17" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                          <circle
                            cx="20" cy="20" r="17" fill="none"
                            stroke={color} strokeWidth="4"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-neutral-800">
                          {s.adoption_pct}%
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-neutral-800">{s.capability_name}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </ChartCard>
      </div>

      {/* ================================================================== */}
      {/* Section 4: Developer Comparison                                      */}
      {/* ================================================================== */}
      <SectionDivider title="Developer Comparison" />


      {/* Developer toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3" style={{ minWidth: 250 }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={devSearch}
              onChange={(e) => { setDevSearch(e.target.value); setDevPage(1); }}
              placeholder="Search developers..."
              className="w-full rounded border-2 border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-600 placeholder:text-neutral-400 focus:border-navy-700 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-neutral-500">Sort by:</label>
            <select
              value={sortColToDropdown[devSortCol] || 'endpoints'}
              onChange={(e) => {
                const mapping = dropdownToSortCol[e.target.value];
                if (mapping) { setDevSortCol(mapping.col); setDevSortDir(mapping.dir); setDevPage(1); }
              }}
              aria-label="Sort developers by"
              className="rounded border-2 border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="endpoints">Most Endpoints</option>
              <option value="name">Name (A-Z)</option>
              <option value="organizations">Most Organizations</option>
              <option value="health">Most Available</option>
              <option value="response_time">Fastest Response</option>
            </select>
          </div>
          <button
            onClick={exportDevCsv}
            className="flex items-center gap-1.5 rounded border-2 border-navy-700 bg-white px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Developer comparison table */}
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                {([
                  { key: 'vendor_name', label: 'Developer Name', cls: 'text-left' },
                  { key: 'endpoint_count', label: 'Endpoints', cls: 'text-right' },
                  { key: 'org_count', label: 'Organizations', cls: 'text-right' },
                  { key: 'available_pct', label: 'Endpoint Health', cls: 'text-left' },
                  { key: 'avg_response_time_ms', label: 'Avg Response Time', cls: 'text-right' },
                ] as const).map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${col.cls} text-xs font-bold uppercase tracking-wider cursor-pointer select-none`}
                    onClick={() => toggleDevSort(col.key)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.cls === 'text-right' ? 'justify-end w-full' : ''}`}>
                      {col.label}
                      {devSortCol === col.key ? (
                        devSortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pagedDevs.map((dev, idx) => (
                <tr key={dev.vendor_name} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                  <td className="px-4 py-3 font-bold text-navy-700">{dev.vendor_name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-700">
                    {formatNumber(dev.endpoint_count)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-700">
                    {formatNumber(dev.org_count)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-2.5 w-24 overflow-hidden rounded-full">
                        <div
                          className="h-full"
                          style={{ width: `${dev.available_pct}%`, backgroundColor: STATUS_COLORS.available }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${dev.degraded_pct}%`, backgroundColor: STATUS_COLORS.degraded }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${dev.down_pct}%`, backgroundColor: STATUS_COLORS.down }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">{dev.available_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold text-neutral-700">
                      {formatNumber(dev.avg_response_time_ms)}ms
                    </span>
                  </td>
                </tr>
              ))}
              {pagedDevs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No developers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredDevs.length > devPageSize && (
          <div className="border-t border-neutral-100 px-4 py-3">
            <Pagination
              page={safePage}
              totalPages={devTotalPages}
              totalCount={filteredDevs.length}
              pageSize={devPageSize}
              onPageChange={setDevPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
