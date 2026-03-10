import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CapStatFieldsTab } from './components/CapStatFieldsTab';
import { FieldValuesTab } from './components/FieldValuesTab';
import { ValidationResultsTab } from './components/ValidationResultsTab';

export default function ConformanceValidationPage() {
  const [activeTab, setActiveTab] = useState<'fields' | 'values' | 'validation'>('fields');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformance & Validation"
        subtitle="How well do endpoints conform to the FHIR specification? Explore capability statement fields, their values, and validation results."
        breadcrumbs={[{ label: 'Capabilities' }, { label: 'Conformance & Validation' }]}
      />

      {/* Sub-Navigation */}
      <div className="flex bg-white rounded-lg p-1 shadow-sm border border-neutral-200 overflow-x-auto w-fit">
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'fields'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          CapStat Fields
        </button>
        <button
          onClick={() => setActiveTab('values')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'values'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Field Values
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-5 py-2.5 rounded font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'validation'
              ? 'bg-navy-700 text-white shadow'
              : 'text-gray-500 hover:text-navy-700 hover:bg-gray-50'
          }`}
        >
          Validation Results
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'fields' && <CapStatFieldsTab />}
        {activeTab === 'values' && <FieldValuesTab />}
        {activeTab === 'validation' && <ValidationResultsTab />}
      </div>
    </div>
  );
}
