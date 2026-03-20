import { PageHeader } from '@/components/layout/PageHeader';
import { SmartCapabilitiesTab } from '@/features/capabilities/components/SmartCapabilitiesTab';

export default function SmartCapabilitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SMART-on-FHIR Capabilities"
        subtitle="SMART Core Capabilities advertised by FHIR endpoints"
        breadcrumbs={[{ label: 'SMART Response' }]}
      />
      <SmartCapabilitiesTab />
    </div>
  );
}
