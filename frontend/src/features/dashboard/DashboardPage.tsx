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
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
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
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { BarChart } from '@/components/charts/BarChart';

/* ========================================================================== */
/* Placeholder data constants                                                  */
/* ========================================================================== */

function generateDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return dates;
}

const DATES_30 = generateDates(30);

const PLACEHOLDER_AVAILABILITY_30D = DATES_30.map((date, i) => ({
  date,
  availability: 96.5 + Math.sin(i * 0.4) * 1.2 + Math.random() * 0.8,
}));

const PLACEHOLDER_RESPONSE_TIME_30D = DATES_30.map((date, i) => ({
  date,
  ms: 220 + Math.sin(i * 0.5) * 60 + Math.random() * 40,
}));


const PLACEHOLDER_CODE_TRENDS = DATES_30.map((date, i) => ({
  date,
  '2xx': 58000 + Math.sin(i * 0.3) * 1500 + Math.round(Math.random() * 500),
  '4xx': 2200 + Math.sin(i * 0.5) * 400 + Math.round(Math.random() * 200),
  '5xx': 800 + Math.sin(i * 0.4) * 200 + Math.round(Math.random() * 100),
}));

const MONTHS_12 = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const PLACEHOLDER_VERSION_TRENDS = MONTHS_12.map((month, i) => ({
  month,
  R4: 48000 + i * 900 + Math.round(Math.random() * 500),
  STU3: 8500 - i * 200 + Math.round(Math.random() * 300),
}));


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
  placeholder,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  placeholder?: boolean;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {placeholder && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Sample Data
            </span>
          )}
          {headerRight}
        </div>
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
  return HTTP_STATUS_COLORS.timeout.color;
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

  // Developer table: search, sort, pagination (all client-side)
  // Hooks must be called before any early returns
  const [devSearch, setDevSearch] = useState('');
  const [devSortCol, setDevSortCol] = useState<string>('endpoint_count');
  const [devSortDir, setDevSortDir] = useState<'asc' | 'desc'>('desc');
  const [devPage, setDevPage] = useState(1);
  const devPageSize = 10;

  const devSummary = data?.dev_summary || [];

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
  const availableCount = data.response_tally.http_200;

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

  const degradedCount = codeGroups['3xx'] + codeGroups['4xx'];
  const downCount = codeGroups['5xx'] + codeGroups['timeout'];

  // Status breakdown for donut chart (real data)
  const statusBreakdown = [
    { name: 'Available', value: availableCount, color: STATUS_COLORS.available },
    { name: 'Degraded', value: degradedCount, color: STATUS_COLORS.degraded },
    { name: 'Down', value: downCount, color: STATUS_COLORS.down },
  ];

  // Prepare HTTP code bar chart data (real data)
  const httpBarData = httpCodes
    .filter((c) => c.count_endpoints > 0)
    .sort((a, b) => b.count_endpoints - a.count_endpoints)
    .slice(0, 8)
    .map((c) => ({
      label: c.http_code === 0 ? 'N/A' : `${c.http_code} ${c.code_label || ''}`.trim(),
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

  // Developer bar chart data (top 10)
  const devBarData = devSummary
    .slice(0, 10)
    .map((d) => ({
      name: d.vendor_name,
      value: d.endpoint_count,
    }));

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
    const rows = filteredDevs.map((d) =>
      [d.vendor_name, d.endpoint_count, d.org_count, d.available_pct, d.degraded_pct, d.down_pct, d.avg_response_time_ms].join(',')
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
        subtitle="Nationwide health and availability of FHIR API endpoints"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Last Updated Banner */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-md bg-navy-700 px-4 py-3 text-sm text-white">
        <span className="text-white/70">
          Last updated: {data.totals.last_updated ? data.totals.last_updated.slice(0, 19) : 'Today'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total Endpoints"
          value={totalEndpoints}
          borderColor="#205493"
          icon={<Server size={20} />}
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
          label="Avg Response Time"
          value={data.totals.avg_response_time ? `${Math.round(data.totals.avg_response_time * 1000)}ms` : 'N/A'}
          borderColor="#fdb81e"
          icon={<Clock size={20} />}
        />
      </div>

      {/* ================================================================== */}
      {/* Section 1: Availability & Performance                               */}
      {/* ================================================================== */}
      <SectionDivider title="Availability & Performance" />

      <ChartCard
        title="Endpoint Availability — Last 30 Days"
        subtitle="Percentage of endpoints returning a successful response each day"
        placeholder
        headerRight={
          <select
            className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600"
            disabled
          >
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 12 months</option>
          </select>
        }
      >
        <TimeSeriesChart
          data={PLACEHOLDER_AVAILABILITY_30D}
          xKey="date"
          yKey="availability"
          color={STATUS_COLORS.available}
          height={300}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Avg Response Time — 30 Days"
          subtitle="Milliseconds (lower is better)"
          placeholder
        >
          <TimeSeriesChart
            data={PLACEHOLDER_RESPONSE_TIME_30D}
            xKey="date"
            yKey="ms"
            color={NAVY_COLORS.primary}
            height={220}
          />
        </ChartCard>

        <ChartCard
          title="Current Status Breakdown"
          subtitle={`All ${formatNumber(totalEndpoints)} indexed endpoints`}
        >
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            {statusBreakdown.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 text-sm text-neutral-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name} ({formatNumber(s.value)})
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {statusBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ================================================================== */}
      {/* Section 2: Response Codes & FHIR Versions                           */}
      {/* ================================================================== */}
      <SectionDivider title="Response Codes & FHIR Versions" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* HTTP Response Code Distribution — REAL DATA */}
        <ChartCard
          title="HTTP Response Code Distribution"
          subtitle="Current response codes from all endpoints"
        >
          <ResponsiveContainer width="100%" height={260}>
            <RechartsBarChart data={httpBarData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Endpoints']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {httpBarData.map((entry) => (
                  <Cell key={entry.label} fill={httpCodeColor(entry.code)} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Endpoints by FHIR Version — real data */}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Response Code Trends — placeholder */}
        <ChartCard
          title="Response Code Trends — 30 Days"
          subtitle="Daily breakdown of 2xx, 4xx, and 5xx"
          placeholder
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PLACEHOLDER_CODE_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend />
              <Line type="monotone" dataKey="2xx" stroke={HTTP_STATUS_COLORS['2xx'].color} strokeWidth={2} dot={false} name="2xx Success" />
              <Line type="monotone" dataKey="4xx" stroke={HTTP_STATUS_COLORS['4xx'].color} strokeWidth={2} dot={false} name="4xx Client" />
              <Line type="monotone" dataKey="5xx" stroke={HTTP_STATUS_COLORS['5xx'].color} strokeWidth={2} dot={false} name="5xx Server" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* FHIR Version Adoption Over Time — placeholder */}
        <ChartCard
          title="FHIR Version Adoption Over Time"
          subtitle="Monthly R4 vs STU3 endpoint counts"
          placeholder
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PLACEHOLDER_VERSION_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend />
              <Line type="monotone" dataKey="R4" stroke="#02bfe7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="STU3" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ================================================================== */}
      {/* Section 3: Developer Comparison                                      */}
      {/* ================================================================== */}
      <SectionDivider title="Developer Comparison" />

      <ChartCard
        title="Endpoints by Certified API Developer"
        subtitle="Top developers by total endpoints indexed"
      >
        <HorizontalBarChart data={devBarData} height={280} />
      </ChartCard>

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
                      <span className="text-xs text-neutral-400">{dev.available_pct}%</span>
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
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
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
