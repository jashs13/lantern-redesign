import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import ResourcesTabContent from '@/features/resources/ResourcesTabContent';
import ImplementationGuidesTabContent from '@/features/implementation-guides/ImplementationGuidesTabContent';
import ProfilesTabContent from '@/features/profiles/ProfilesTabContent';
import CapStatSizeTabContent from '@/features/capstat-size/CapStatSizeTabContent';

export default function CapabilitiesResourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Capabilities & Resources"
        subtitle="Explore supported resources, implementation guides, profiles, and capability statement sizes"
        breadcrumbs={[{ label: 'Capabilities', href: '/capabilities' }, { label: 'Resources' }]}
      />
      <Tabs
        tabs={[
          {
            value: 'resources',
            label: 'Resources',
            content: <ResourcesTabContent asTab />,
          },
          {
            value: 'implementation-guides',
            label: 'Implementation Guides',
            content: <ImplementationGuidesTabContent asTab />,
          },
          {
            value: 'profiles',
            label: 'Profiles',
            content: <ProfilesTabContent asTab />,
          },
          {
            value: 'capstat-size',
            label: 'Capability Statement Size',
            content: <CapStatSizeTabContent asTab />,
          },
        ]}
      />
    </div>
  );
}
