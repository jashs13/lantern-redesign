import { DownloadButton } from '@/components/ui/DownloadButton';
import { getEndpointsCsvUrl, getOrganizationsCsvUrl } from '@/api/downloads';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileDown, ExternalLink, Code2 } from 'lucide-react';

export default function DownloadsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Downloads & API"
        subtitle="Export data and access the Lantern REST API"
        breadcrumbs={[{ label: 'Downloads' }]}
      />

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <FileDown size={20} className="text-navy-700" />
          CSV Downloads
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Download the latest endpoint and organization data as CSV files.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DownloadButton url={getEndpointsCsvUrl()} label="Endpoints CSV" />
          <DownloadButton url={getOrganizationsCsvUrl()} label="Organizations CSV" />
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <Code2 size={20} className="text-navy-700" />
          API Access
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          These REST APIs enable programmatic access to download daily Lantern data in CSV format.
        </p>
        <div className="mt-4 space-y-6">
          {/* Endpoint API */}
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-bold text-navy-900">Endpoint Download API</h3>
            <p className="mt-1 text-sm text-neutral-600">Downloads daily FHIR endpoint data.</p>
            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Endpoint</span>
              <p className="mt-1 font-mono text-sm text-navy-700">[GET] /api/v1/downloads/endpoints.csv</p>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Query Parameters</span>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-neutral-600">
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">developer</code> &ndash; Filter by certified API developer name.</li>
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">fhir_version</code> &ndash; Comma-separated list of FHIR versions to include.</li>
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">source</code> &ndash; Filter by source name (e.g., CHPL, State Medicaid, etc).</li>
              </ul>
            </div>
          </div>

          {/* Org API */}
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-bold text-navy-900">Organization Download API</h3>
            <p className="mt-1 text-sm text-neutral-600">Downloads daily organization data associated with endpoints.</p>
            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Endpoint</span>
              <p className="mt-1 font-mono text-sm text-navy-700">[GET] /api/v1/downloads/organizations.csv</p>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Query Parameters</span>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-neutral-600">
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">developer</code> &ndash; Filter by certified API developer name.</li>
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">fhir_version</code> &ndash; Comma-separated list of FHIR versions to include.</li>
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">identifier</code> &ndash; Exact match on organization identifier (e.g., NPI).</li>
                <li><code className="rounded bg-neutral-200 px-1 py-0.5">organization_detail</code> &ndash; Use <code className="rounded bg-neutral-200 px-1 py-0.5">organization_detail=present</code> to return only organizations with data.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-md bg-sky-50 p-4 border border-sky-100 text-sm text-sky-900">
            <p>
              <strong>Note:</strong> Developer names and other parameter values must match exactly as stored in the system.
              If the value contains spaces, commas, or other special characters, it must be URL encoded.
              These APIs will initiate download of the data in CSV format automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <ExternalLink size={20} className="text-navy-700" />
          External Resources
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Additional resources and documentation for the Lantern platform.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://github.com/onc-healthit/lantern-back-end"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-card"
          >
            <ExternalLink size={14} />
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
}
