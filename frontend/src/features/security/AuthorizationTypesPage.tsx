import { PageHeader } from '@/components/layout/PageHeader';
import { AuthorizationTypesTab } from '@/features/capabilities/components/AuthorizationTypesTab';

export default function AuthorizationTypesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorization Types"
        subtitle="Security authorization types declared by FHIR endpoints"
        breadcrumbs={[{ label: 'Security' }]}
      />
      <AuthorizationTypesTab />
    </div>
  );
}
