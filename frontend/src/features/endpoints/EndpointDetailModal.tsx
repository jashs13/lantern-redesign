import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { fetchEndpointDetails, fetchEndpointResponseTime, fetchEndpointHTTPHistory } from '@/api/endpoints';
import { formatPercent, formatDuration, formatHttpStatus, formatDate } from '@/lib/formatters';

function getStatusVariant(httpCode: number | null): 'available' | 'degraded' | 'down' | 'unknown' {
  if (httpCode === null) return 'unknown';
  if (httpCode >= 200 && httpCode < 300) return 'available';
  if (httpCode >= 300 && httpCode < 500) return 'degraded';
  return 'down';
}

function getFhirBadgeVariant(ver: string | null) {
  if (!ver) return 'default' as const;
  if (ver.startsWith('4.0')) return 'fhir-r4' as const;
  return 'fhir' as const;
}

function getFhirLabel(ver: string | null) {
  if (!ver) return '—';
  if (ver.startsWith('4.0')) return 'R4';
  if (ver.startsWith('3.0')) return 'STU3';
  if (ver.startsWith('1.0')) return 'DSTU2';
  if (ver.startsWith('4.1') || ver.startsWith('4.3')) return 'R4B';
  if (ver.startsWith('5.0')) return 'R5';
  return ver;
}

function getCertStatusVariant(status: string | null): 'success' | 'error' | 'default' {
  if (!status) return 'default';
  if (status.toLowerCase() === 'active') return 'success';
  if (status.toLowerCase().includes('withdrawn')) return 'error';
  return 'default';
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <>
      <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</dt>
      <dd className="text-sm text-neutral-800 break-words">{children}</dd>
    </>
  );
}

const REQUIRED_FIELDS = ['status', 'kind', 'fhirVersion', 'format', 'date'];
const DATE_OPTIONS = [7, 14, 30, 90] as const;

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ backgroundColor: '#d9eaf7' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#1a3a5c' }}>{title}</span>
        <span className="text-neutral-500 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  );
}

// Wraps a render function — content is only evaluated after first open
function LazyCollapsibleSection({ title, renderContent }: { title: string; renderContent: () => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const handleToggle = () => {
    if (!everOpened) setEverOpened(true);
    setOpen(v => !v);
  };
  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ backgroundColor: '#d9eaf7' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#1a3a5c' }}>{title}</span>
        <span className="text-neutral-500 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {everOpened && (
        <div className="px-4 py-3 bg-white" style={{ display: open ? 'block' : 'none' }}>
          {renderContent()}
        </div>
      )}
    </div>
  );
}

function JsonNode({ k, v, depth }: { k: string; v: unknown; depth: number }) {
  const [open, setOpen] = useState(false);
  const isObj = v !== null && typeof v === 'object';
  const entries = isObj
    ? Array.isArray(v)
      ? (v as unknown[]).map((item, i) => [String(i), item] as [string, unknown])
      : Object.entries(v as Record<string, unknown>)
    : [];
  const preview = isObj
    ? Array.isArray(v) ? `Array[${(v as unknown[]).length}]` : `{${entries.length} fields}`
    : null;

  return (
    <div style={{ marginLeft: depth > 0 ? '14px' : 0 }} className="border-l border-neutral-100 pl-2 py-0.5">
      <div className="flex items-start gap-1 flex-wrap">
        <span className="font-mono text-xs font-semibold text-purple-700 shrink-0">{k}:</span>
        {isObj ? (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="font-mono text-xs text-blue-600 hover:underline text-left"
          >
            {open ? '▼' : '▶'} {preview}
          </button>
        ) : (
          <span className="font-mono text-xs text-neutral-700 break-all">
            {v === null ? <span className="text-neutral-400 italic">null</span> : String(v)}
          </span>
        )}
      </div>
      {open && isObj && entries.map(([ek, ev]) => (
        <JsonNode key={ek} k={ek} v={ev} depth={depth + 1} />
      ))}
    </div>
  );
}

function JsonTree({ json }: { json: string | null | undefined }) {
  if (!json) return <p className="text-sm italic text-neutral-400">Not available</p>;
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return <p className="text-sm italic text-red-400">Invalid JSON</p>; }
  const entries = parsed !== null && typeof parsed === 'object'
    ? Array.isArray(parsed)
      ? (parsed as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(parsed as Record<string, unknown>)
    : [];
  return (
    <div className="font-mono text-xs bg-neutral-50 rounded p-3 max-h-96 overflow-y-auto overflow-x-auto">
      {entries.map(([k, v]) => <JsonNode key={k} k={k} v={v} depth={0} />)}
    </div>
  );
}

interface EndpointDetailModalProps {
  url: string | null;
  onClose: () => void;
}

export function EndpointDetailModal({ url, onClose }: EndpointDetailModalProps) {
  const [chartDays, setChartDays] = useState<number>(7);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['endpoint-detail', url],
    queryFn: () => fetchEndpointDetails(url!),
    enabled: !!url,
    staleTime: 5 * 60 * 1000,
  });

  const { data: responseTimeData } = useQuery({
    queryKey: ['endpoint-response-time', url, chartDays],
    queryFn: () => fetchEndpointResponseTime(url!, chartDays),
    enabled: !!url,
    staleTime: 5 * 60 * 1000,
  });

  const { data: httpHistoryData } = useQuery({
    queryKey: ['endpoint-http-history', url, chartDays],
    queryFn: () => fetchEndpointHTTPHistory(url!, chartDays),
    enabled: !!url,
    staleTime: 5 * 60 * 1000,
  });

  const responseTimeChartData = (responseTimeData ?? []).map(p => ({
    time: new Date(p.time * 1000).toLocaleDateString(),
    response: parseFloat(p.response.toFixed(3)),
  }));

  const httpHistoryChartData = (httpHistoryData ?? []).map(p => ({
    time: new Date(p.time * 1000).toLocaleDateString(),
    http_response: p.http_response,
  }));

  const overviewContent = (
    <div className="space-y-4">
      {/* Endpoint Info */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <FieldRow label="URL">
          <span className="font-mono text-xs break-all">{detail?.url || '—'}</span>
        </FieldRow>
        <FieldRow label="Vendor">
          {detail?.vendor_name || '—'}
        </FieldRow>
        <FieldRow label="FHIR Version">
          {detail?.fhir_version ? (
            <Badge variant={getFhirBadgeVariant(detail.fhir_version)}>
              {getFhirLabel(detail.fhir_version)}
            </Badge>
          ) : '—'}
        </FieldRow>
        <FieldRow label="List Source">
          {detail?.list_source || '—'}
        </FieldRow>
        <FieldRow label="HTTP Status">
          {detail?.http_response != null ? (
            <StatusBadge
              status={getStatusVariant(detail.http_response)}
              label={formatHttpStatus(detail.http_response)}
              className="px-1.5 py-0.5"
            />
          ) : '—'}
        </FieldRow>
        <FieldRow label="SMART HTTP Response">
          {detail?.smart_http_response != null
            ? formatHttpStatus(detail.smart_http_response)
            : '—'}
        </FieldRow>
        <FieldRow label="Availability">
          {detail?.availability != null ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-status-green"
                  style={{ width: `${(detail.availability) * 100}%` }}
                />
              </div>
              <span>{formatPercent(detail.availability)}</span>
            </div>
          ) : '—'}
        </FieldRow>
        <FieldRow label="Response Time">
          {formatDuration(detail?.response_time_seconds ?? null)}
        </FieldRow>
        <FieldRow label="TLS Version">
          {detail?.tls_version || '—'}
        </FieldRow>
        <FieldRow label="Format">
          {detail?.format || '—'}
        </FieldRow>
        <FieldRow label="Security">
          {detail?.security || '—'}
        </FieldRow>
        <FieldRow label="Capability Statement">
          {detail?.capability_statement
            ? <Badge variant="success">Present</Badge>
            : <Badge variant="default">Not present</Badge>}
        </FieldRow>
        <FieldRow label="SMART Response">
          {detail?.smart_response
            ? <Badge variant="success">Present</Badge>
            : <Badge variant="default">Not present</Badge>}
        </FieldRow>
        <FieldRow label="Cap Statement FHIR">
          {detail?.capability_fhir_version || '—'}
        </FieldRow>
      </dl>

      {/* Software */}
      <div className="border-t border-neutral-200 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Software</h4>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <FieldRow label="Software Name">{detail?.software_name || 'Not Available'}</FieldRow>
          <FieldRow label="Software Version">{detail?.software_version || 'Not Available'}</FieldRow>
        </dl>
      </div>

      {/* Historical Data Charts */}
      <div className="border-t border-neutral-200 pt-3 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Historical Data
          </h4>
          <div className="flex items-center gap-1">
            {DATE_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setChartDays(d)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  chartDays === d
                    ? 'bg-navy-700 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">Endpoint Response Time</p>
          {responseTimeChartData.length === 0 ? (
            <p className="text-sm text-center italic text-neutral-400 py-4">No response time data available</p>
          ) : (
            <TimeSeriesChart data={responseTimeChartData} xKey="time" yKey="response" height={180} />
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">Endpoint HTTP Responses</p>
          {httpHistoryChartData.length === 0 ? (
            <p className="text-sm text-center italic text-neutral-400 py-4">No HTTP history data available</p>
          ) : (
            <TimeSeriesChart data={httpHistoryChartData} xKey="time" yKey="http_response" height={180} />
          )}
        </div>
      </div>
    </div>
  );

  const orgsCount = detail?.organizations?.length ?? 0;
  const organizationsContent = (
    <div>
      {orgsCount === 0 ? (
        <p className="py-4 text-center text-sm italic text-neutral-400">No linked organizations</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Organization Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {detail?.organizations.map((org, i) => (
              <tr key={i} className="hover:bg-neutral-50">
                <td className="px-3 py-2 text-sm text-neutral-800">{org.organization_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Capability tab
  const capFields = detail?.capability_fields ?? [];
  const nonExtFields = capFields.filter(f => !f.is_extension);
  const extFields = capFields.filter(f => f.is_extension);
  const reqFields = nonExtFields.filter(f => REQUIRED_FIELDS.includes(f.field_name));
  const optFields = nonExtFields.filter(f => !REQUIRED_FIELDS.includes(f.field_name));

  function FieldExistsTable({ fields, label }: { fields: typeof capFields; label: string }) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">{label}</p>
        {fields.length === 0 ? (
          <p className="text-sm italic text-neutral-400 py-1">None</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Field Name</th>
                <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Exists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {fields.map((f, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 font-mono text-xs text-neutral-700">{f.field_name}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {f.exists
                      ? <span className="text-green-600 font-semibold">✓</span>
                      : <span className="text-red-400">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  const opResources = detail?.operation_resources ?? [];
  const smartCaps = detail?.smart_capabilities ?? [];

  // Group operation resources by operation name — no repeated rows
  const opResourcesGrouped = opResources.reduce<Record<string, string[]>>((acc, { operation, resource }) => {
    if (!acc[operation]) acc[operation] = [];
    acc[operation].push(resource);
    return acc;
  }, {});

  const capabilityContent = (
    <div className="space-y-2">
      {/* Section 1: Capability/Conformance Fields */}
      <CollapsibleSection title="Capability / Conformance Fields">
        <FieldExistsTable fields={reqFields} label="Required Fields" />
        <FieldExistsTable fields={optFields} label="Optional Fields" />
        <FieldExistsTable fields={extFields} label="Extensions" />
      </CollapsibleSection>

      {/* Section 2: Capability/Conformance Resources */}
      <CollapsibleSection title="Capability / Conformance Resources">
        {Object.keys(opResourcesGrouped).length === 0 ? (
          <p className="text-sm italic text-neutral-400 py-2">No operation resources declared</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 w-1/4">Operation</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Resources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {Object.entries(opResourcesGrouped).map(([op, resources]) => (
                <tr key={op} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600 align-top">{op}</td>
                  <td className="px-3 py-2 text-xs text-neutral-800">{resources.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      {/* Section 3: SMART Response Fields */}
      <CollapsibleSection title="SMART Response Fields">
        {smartCaps.length === 0 ? (
          <p className="text-sm italic text-neutral-400 py-2">No SMART capabilities declared</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Capability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {smartCaps.map((cap, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 font-mono text-xs text-neutral-700">{cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      {/* Section 4: Capability Statement JSON — lazy to avoid parsing large JSON until opened */}
      <LazyCollapsibleSection
        title="Capability Statement / Conformance Resource"
        renderContent={() => <JsonTree json={detail?.capability_statement} />}
      />

      {/* Section 5: SMART Response JSON — lazy to avoid parsing large JSON until opened */}
      <LazyCollapsibleSection
        title="SMART Response"
        renderContent={() => <JsonTree json={detail?.smart_response} />}
      />
    </div>
  );

  const implGuidesCount = (detail?.implementation_guides?.length ?? 0) + (detail?.supported_profiles?.length ?? 0);
  const guidesContent = (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Implementation Guides
        </h4>
        {(detail?.implementation_guides ?? []).length === 0 ? (
          <p className="text-sm italic text-neutral-400 py-2">No implementation guides declared</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Guide URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {detail?.implementation_guides.map((guide, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700 break-all">{guide}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Endpoint Profiles
        </h4>
        {(detail?.supported_profiles ?? []).length === 0 ? (
          <p className="text-sm italic text-neutral-400 py-2">No profiles declared</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Profile URL</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Profile Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {detail?.supported_profiles.map((p, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700 break-all">{p.profile_url}</td>
                  <td className="px-3 py-2 text-xs text-neutral-700">{p.profile_name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-neutral-700">{p.resource || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const productsCount = detail?.products?.length ?? 0;
  const productsContent = (
    <div>
      {productsCount === 0 ? (
        <p className="py-4 text-center text-sm italic text-neutral-400">No CHPL products linked to this endpoint</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Version</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Cert Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Cert Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Edition</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">CHPL ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {detail?.products.map((product, i) => (
              <tr key={i} className="hover:bg-neutral-50">
                <td className="px-3 py-2 text-sm text-neutral-800">
                  <div className="flex items-center gap-1">
                    <span>{product.name}</span>
                    {product.api_url && (
                      <a
                        href={product.api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy-700 hover:text-navy-500"
                        aria-label={`Open ${product.name} API URL`}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">{product.version || '—'}</td>
                <td className="px-3 py-2">
                  {product.certification_status ? (
                    <Badge variant={getCertStatusVariant(product.certification_status)}>
                      {product.certification_status}
                    </Badge>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">
                  {formatDate(product.certification_date)}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">{product.certification_edition || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-500">{product.chpl_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const tabs = [
    { value: 'overview', label: 'Overview', content: overviewContent },
    { value: 'organizations', label: `Organizations (${orgsCount})`, content: organizationsContent },
    { value: 'capability', label: 'Capability', content: capabilityContent },
    { value: 'impl-guides', label: `Impl. Guides & Profiles (${implGuidesCount})`, content: guidesContent },
    { value: 'products', label: `CHPL Products (${productsCount})`, content: productsContent },
  ];

  return (
    <Modal
      open={!!url}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={detail?.endpoint_names || url || 'Endpoint Detail'}
      maxWidth="max-w-4xl"
    >
      {isLoading ? (
        <LoadingState message="Loading endpoint details..." />
      ) : error || !detail ? (
        <p className="py-8 text-center text-sm text-red-500">Failed to load endpoint details.</p>
      ) : (
        <Tabs tabs={tabs} />
      )}
    </Modal>
  );
}
