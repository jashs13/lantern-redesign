import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AuthorizationTypesTab } from './components/AuthorizationTypesTab';
import { SmartCapabilitiesTab } from './components/SmartCapabilitiesTab';

export default function SecuritySmartPage() {
  const [activeTab, setActiveTab] = useState<'auth' | 'smart'>('auth');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & SMART"
        subtitle="How are FHIR endpoints secured? Explore authorization types, SMART-on-FHIR core capabilities, and well-known configuration support."
        breadcrumbs={[
          { label: 'Capabilities', href: '/capabilities' },
          { label: 'Security & SMART' },
        ]}
      />

      {/* Sub-Navigation */}
      <div className="flex bg-white rounded-lg p-1 shadow-sm border border-neutral-200 overflow-x-auto w-fit">
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'auth'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Authorization Types
        </button>
        <button
          onClick={() => setActiveTab('smart')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'smart'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          SMART-on-FHIR Capabilities
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'auth' && <AuthorizationTypesTab />}
        {activeTab === 'smart' && <SmartCapabilitiesTab />}
      </div>
    </div>
  );
}
