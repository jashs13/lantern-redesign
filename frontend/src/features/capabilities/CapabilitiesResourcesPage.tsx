import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import ResourcesTabContent from '@/features/resources/ResourcesTabContent';
import ImplementationGuidesTabContent from '@/features/implementation-guides/ImplementationGuidesTabContent';
import ProfilesTabContent from '@/features/profiles/ProfilesTabContent';
import CapStatSizeTabContent from '@/features/capstat-size/CapStatSizeTabContent';

export default function CapabilitiesResourcesPage() {
  const [activeTab, setActiveTab] = useState<'resources' | 'implementation-guides' | 'profiles' | 'capstat-size'>('resources');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capabilities & Resources"
        subtitle="Explore supported resources, implementation guides, profiles, and capability statement sizes"
        breadcrumbs={[{ label: 'Capabilities', href: '/capabilities' }, { label: 'Resources' }]}
      />

      {/* Sub-Navigation */}
      <div className="flex bg-white rounded-lg p-1 shadow-sm border border-neutral-200 overflow-x-auto w-fit">
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'resources'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setActiveTab('implementation-guides')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'implementation-guides'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Implementation Guides
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'profiles'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Profiles
        </button>
        <button
          onClick={() => setActiveTab('capstat-size')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'capstat-size'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Capability Statement Size
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'resources' && <ResourcesTabContent asTab />}
        {activeTab === 'implementation-guides' && <ImplementationGuidesTabContent asTab />}
        {activeTab === 'profiles' && <ProfilesTabContent asTab />}
        {activeTab === 'capstat-size' && <CapStatSizeTabContent asTab />}
      </div>
    </div>
  );
}
