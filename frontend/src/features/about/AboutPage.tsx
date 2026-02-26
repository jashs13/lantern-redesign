import { PageHeader } from '@/components/layout/PageHeader';
import { Info, Github, ExternalLink, Shield, Server, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About Lantern"
        subtitle="Open-source health IT monitoring platform"
        breadcrumbs={[{ label: 'About' }]}
      />

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-navy-900">
          <Info size={20} className="text-navy-700" />
          Overview
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
          <p>
            <strong className="text-navy-900">Lantern</strong> is an open-source tool developed by
            the Office of the National Coordinator for Health Information Technology (ONC) and
            Mettle Solutions LLC to monitor FHIR API endpoints across US healthcare organizations.
          </p>
          <p>
            Lantern tracks endpoint availability, FHIR adoption metrics, and Capability Statements
            to provide a comprehensive view of the health IT interoperability landscape.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-5 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-700/10">
            <Server size={20} className="text-navy-700" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">Endpoint Monitoring</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Continuous monitoring of FHIR API availability and response times.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-5 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-700/10">
            <Globe size={20} className="text-navy-700" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">FHIR Adoption</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Track FHIR version adoption and capability statement compliance.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-5 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-700/10">
            <Shield size={20} className="text-navy-700" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">Security Analysis</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Security configuration and authentication analysis for endpoints.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="font-serif text-lg font-bold text-navy-900">Details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-neutral-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Version
            </dt>
            <dd className="mt-1 font-semibold text-navy-900">3.0.0</dd>
          </div>
          <div className="rounded-md bg-neutral-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              License
            </dt>
            <dd className="mt-1 font-semibold text-navy-900">Apache 2.0</dd>
          </div>
          <div className="rounded-md bg-neutral-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Developed By
            </dt>
            <dd className="mt-1 font-semibold text-navy-900">ONC / Mettle Solutions LLC</dd>
          </div>
          <div className="rounded-md bg-neutral-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Source Code
            </dt>
            <dd className="mt-1">
              <a
                href="https://github.com/onc-healthit/lantern-back-end"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-navy-700 hover:underline"
              >
                <Github size={14} />
                GitHub Repository
                <ExternalLink size={12} />
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
