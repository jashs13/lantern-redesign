import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchDashboardSummary } from '@/api/dashboard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/layout/PageHeader';
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

const PLACEHOLDER_FHIR_VERSIONS = [
  { version: 'DSTU2', count: 1200 },
  { version: 'STU3', count: 3500 },
  { version: 'R4', count: 58000 },
  { version: 'R4B', count: 800 },
  { version: 'R5', count: 200 },
];

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

const PLACEHOLDER_DEVELOPERS = [
  { name: 'Epic Systems', value: 25400 },
  { name: 'Oracle Health', value: 14200 },
  { name: 'Veradigm', value: 4100 },
  { name: 'athenahealth', value: 3800 },
  { name: 'eClinicalWorks', value: 2950 },
  { name: 'MEDITECH', value: 2100 },
  { name: 'NextGen', value: 1400 },
  { name: 'ModMed', value: 870 },
];

const PLACEHOLDER_DEV_TABLE = [
  { name: 'Epic Systems Corporation', endpoints: 37842, orgs: 98412, available: 98.5, degraded: 1.0, down: 0.5, availability: 99.7, status: 'Complete' },
  { name: 'Oracle Health (Cerner)', endpoints: 14567, orgs: 42318, available: 97, degraded: 2, down: 1, availability: 99.4, status: 'Complete' },
  { name: 'Veradigm (Allscripts)', endpoints: 4231, orgs: 15847, available: 95, degraded: 3, down: 2, availability: 98.6, status: 'Complete' },
  { name: 'athenahealth', endpoints: 3856, orgs: 12934, available: 96, degraded: 2.5, down: 1.5, availability: 99.1, status: 'Complete' },
  { name: 'eClinicalWorks', endpoints: 2987, orgs: 8234, available: 93, degraded: 4, down: 3, availability: 97.8, status: 'Complete' },
  { name: 'MEDITECH', endpoints: 2134, orgs: 6421, available: 97.5, degraded: 1.5, down: 1, availability: 99.3, status: 'Complete' },
];

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

        {/* Endpoints by FHIR Version — placeholder */}
        <ChartCard
          title="Endpoints by FHIR Version"
          subtitle="Specification version distribution"
          placeholder
        >
          <BarChart
            data={PLACEHOLDER_FHIR_VERSIONS}
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
        placeholder
      >
        <HorizontalBarChart data={PLACEHOLDER_DEVELOPERS} height={280} />
      </ChartCard>

      {/* Developer toolbar (non-functional) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3" style={{ minWidth: 250 }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder="Search developers..."
              disabled
              className="w-full rounded border-2 border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-600 placeholder:text-neutral-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-neutral-500">Sort by:</label>
            <select disabled className="rounded border-2 border-neutral-200 bg-white px-3 py-2 text-sm">
              <option>Most Endpoints</option>
              <option>Name (A-Z)</option>
              <option>Most Organizations</option>
              <option>Best Availability</option>
            </select>
          </div>
          <button disabled className="flex items-center gap-1.5 rounded border-2 border-navy-700 bg-white px-4 py-2 text-sm font-semibold text-navy-700 opacity-60">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="text-sm text-neutral-500">
        Showing <strong className="text-neutral-700">6</strong> of 214 developers
        <span className="ml-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          Sample Data
        </span>
      </div>

      {/* Developer comparison table */}
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Developer Name</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Endpoints</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Organizations</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Endpoint Health</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Avg Availability</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Publication Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {PLACEHOLDER_DEV_TABLE.map((dev, idx) => (
                <tr key={dev.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                  <td className="px-4 py-3 font-bold text-navy-700">{dev.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-700">
                    {formatNumber(dev.endpoints)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-700">
                    {formatNumber(dev.orgs)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-2.5 w-24 overflow-hidden rounded-full">
                        <div
                          className="h-full"
                          style={{ width: `${dev.available}%`, backgroundColor: STATUS_COLORS.available }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${dev.degraded}%`, backgroundColor: STATUS_COLORS.degraded }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${dev.down}%`, backgroundColor: STATUS_COLORS.down }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400">{dev.available}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-mono font-semibold"
                      style={{
                        color:
                          dev.availability >= 99
                            ? STATUS_COLORS.available
                            : dev.availability >= 98
                              ? NAVY_COLORS.primary
                              : STATUS_COLORS.degraded,
                      }}
                    >
                      {dev.availability}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {dev.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
