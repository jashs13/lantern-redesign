import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import ResourcesPage from '@/features/resources/ResourcesPage';
import ImplementationGuidesPage from '@/features/implementation-guides/ImplementationGuidesPage';
import ProfilesPage from '@/features/profiles/ProfilesPage';
import CapStatSizePage from '@/features/capstat-size/CapStatSizePage';

export default function CapabilitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Capabilities & Resources"
        subtitle="Explore supported resources, implementation guides, profiles, and capability statement sizes"
        breadcrumbs={[{ label: 'Capabilities' }]}
      />
      <Tabs
        tabs={[
          {
            value: 'resources',
            label: 'Resources',
            content: <ResourcesPage asTab />,
          },
          {
            value: 'implementation-guides',
            label: 'Implementation Guides',
            content: <ImplementationGuidesPage asTab />,
          },
          {
            value: 'profiles',
            label: 'Profiles',
            content: <ProfilesPage asTab />,
          },
          {
            value: 'capstat-size',
            label: 'Capability Statement Size',
            content: <CapStatSizePage asTab />,
          },
        ]}
      />
    </div>
  );
}
