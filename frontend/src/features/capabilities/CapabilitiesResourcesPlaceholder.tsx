import { PageHeader } from '@/components/layout/PageHeader';

export default function CapabilitiesResourcesPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Capabilities & Resources"
        breadcrumbs={[
          { label: 'Capabilities', href: '/capabilities' },
          { label: 'Resources' }
        ]}
      />
      
      <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500 shadow-sm">
        <div className="mb-4 text-4xl">📦</div>
        <h3 className="mb-2 text-xl font-bold text-navy-900">Under Construction</h3>
        <p className="max-w-md text-sm">
          Content regarding resources, profiles, and implementation guides is currently being developed and will be available soon.
        </p>
      </div>
    </div>
  );
}
