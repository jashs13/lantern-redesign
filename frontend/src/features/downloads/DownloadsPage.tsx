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
          Lantern exposes a REST API for programmatic data access. All endpoints are read-only
          and return JSON.
        </p>
        <div className="mt-4 space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Base URL
            </span>
            <p className="mt-1 font-mono text-sm text-navy-700">/api/v1</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Example Request
            </span>
            <p className="mt-1 font-mono text-sm text-navy-700">
              GET /api/v1/endpoints?page=1&page_size=25
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
