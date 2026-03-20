import { PageHeader } from '@/components/layout/PageHeader';
import { FieldValuesTab } from './components/FieldValuesTab';

export default function FieldValuesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CapStat Values"
        subtitle="Values reported by endpoints for Capability Statement fields"
        breadcrumbs={[{ label: 'CapStat Values' }]}
      />
      <FieldValuesTab />
    </div>
  );
}
