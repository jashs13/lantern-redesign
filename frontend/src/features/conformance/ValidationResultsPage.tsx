import { PageHeader } from '@/components/layout/PageHeader';
import { ValidationResultsTab } from './components/ValidationResultsTab';

export default function ValidationResultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Validations"
        subtitle="Validation results for FHIR endpoint Capability Statements"
        breadcrumbs={[{ label: 'Validations' }]}
      />
      <ValidationResultsTab />
    </div>
  );
}
