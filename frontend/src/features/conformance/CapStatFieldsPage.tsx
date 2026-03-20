import { PageHeader } from '@/components/layout/PageHeader';
import { CapStatFieldsTab } from './components/CapStatFieldsTab';

export default function CapStatFieldsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CapStat Fields"
        subtitle="Fields present in endpoint FHIR Capability Statements"
        breadcrumbs={[{ label: 'CapStat Fields' }]}
      />
      <CapStatFieldsTab />
    </div>
  );
}
