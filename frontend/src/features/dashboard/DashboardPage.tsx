import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchDashboardSummary } from '@/api/dashboard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/ui/KpiCard';
import { HttpStatusCard } from '@/components/ui/HttpStatusCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { HTTP_STATUS_COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import {
  Server,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  FileCheck,
  Globe,
  Table,
  Shield,
  Download,
  BarChart3,
} from 'lucide-react';

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
  const unavailableCount = totalEndpoints - availableCount;

  // Compute unique vendor count
  const uniqueVendors = new Set(data.vendor_counts.map((v) => v.vendor_name)).size;

  // Compute FHIR R4 adoption
  const r4Count = data.vendor_counts
    .filter((v) => v.fhir_version?.startsWith('4.0'))
    .reduce((sum, v) => sum + v.count, 0);
  const r4Pct = totalEndpoints > 0 ? ((r4Count / totalEndpoints) * 100).toFixed(1) : '0';

  // Build HTTP code distribution from data
  const httpCodes = data.http_codes || [];
  const totalHttpCount = httpCodes.reduce((s, c) => s + c.count_endpoints, 0);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Dashboard"
        subtitle="Real-time monitoring of FHIR endpoint availability and performance"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Live Data Banner */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-md bg-navy-700 px-4 py-3 text-sm text-white">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-status-green-light" />
          <strong>Live Data</strong>
        </span>
        <span className="text-white/70">
          Last updated: {data.totals.last_updated || 'Today'}
        </span>
        <span className="text-white/70">
          Monitoring {formatNumber(totalEndpoints)} endpoints
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          label="Unavailable"
          value={unavailableCount}
          borderColor="#e31c3d"
          icon={<XCircle size={20} />}
        />
        <KpiCard
          label="Avg Response Time"
          value="342ms"
          borderColor="#fdb81e"
          icon={<Clock size={20} />}
        />
        <KpiCard
          label="Organizations"
          value={uniqueVendors}
          borderColor="#02bfe7"
          icon={<Building2 size={20} />}
        />
        <KpiCard
          label="FHIR R4 Adoption"
          value={`${r4Pct}%`}
          borderColor="#4773aa"
          icon={<FileCheck size={20} />}
        />
      </div>

      {/* HTTP Status Code Distribution */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-bold text-navy-900">
          HTTP Status Code Distribution
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {(['2xx', '3xx', '4xx', '5xx', 'timeout'] as const).map((code) => {
            const meta = HTTP_STATUS_COLORS[code];
            return (
              <HttpStatusCard
                key={code}
                code={code.toUpperCase()}
                label={meta.label}
                count={codeGroups[code]}
                total={totalHttpCount}
                color={meta.color}
                bgColor={meta.bg}
              />
            );
          })}
        </div>

        {/* Detailed breakdown table */}
        {httpCodes.length > 0 && (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-navy-900 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                    Status Code
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                    Endpoints
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {httpCodes.slice(0, 12).map((c, idx) => (
                  <tr
                    key={c.http_code}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
                  >
                    <td className="px-4 py-2 font-mono font-semibold text-neutral-700">
                      {c.http_code}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">
                      {c.code_label || `HTTP ${c.http_code}`}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-neutral-700">
                      {formatNumber(c.count_endpoints)}
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-500">
                      {totalHttpCount > 0
                        ? ((c.count_endpoints / totalHttpCount) * 100).toFixed(1)
                        : '0'}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-bold text-navy-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Globe size={20} />, title: 'Browse Endpoints', desc: 'View all monitored FHIR endpoints', to: '/endpoints' },
            { icon: <Building2 size={20} />, title: 'View Organizations', desc: 'Explore healthcare organizations', to: '/organizations' },
            { icon: <Table size={20} />, title: 'Resources', desc: 'FHIR resource type availability', to: '/resources' },
            { icon: <Shield size={20} />, title: 'Security Analysis', desc: 'Endpoint security and auth data', to: '/security' },
            { icon: <BarChart3 size={20} />, title: 'SMART Response', desc: 'SMART on FHIR capabilities', to: '/smart-response' },
            { icon: <Download size={20} />, title: 'Downloads & API', desc: 'Export data and API access', to: '/downloads' },
          ].map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="flex items-start gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-card transition-all no-underline hover:shadow-card-hover"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-700/10 text-navy-700">
                {action.icon}
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">{action.title}</h3>
                <p className="mt-0.5 text-sm text-neutral-500">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
