import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { fetchVendors } from '@/api/filters';
import { FHIR_VERSION_GROUP_NAMES } from '@/lib/constants';
import { MultiSelect } from './MultiSelect';
import { Select } from './Select';
import { RotateCcw } from 'lucide-react';

export function FilterBar() {
  const { filters, setFhirVersions, setVendor, resetFilters } = useFilters();

  const { data: vendors = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
  });

  const vendorOptions = [
    { value: '__all__', label: 'All Vendors' },
    ...vendors.map((v) => ({ value: v.value, label: v.label || v.value })),
  ];

  return (
    <div className="flex items-center gap-4">
      <MultiSelect
        label="FHIR Version"
        options={[...FHIR_VERSION_GROUP_NAMES]}
        selected={filters.fhirVersions}
        onChange={setFhirVersions}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">Vendor</p>
        <Select
          value={filters.vendor ?? '__all__'}
          onValueChange={(v) => setVendor(v === '__all__' ? null : v)}
          options={vendorOptions}
          placeholder="All Vendors"
          className="min-w-[160px]"
        />
      </div>

      {(filters.fhirVersions.length > 0 || filters.vendor) && (
        <button
          onClick={resetFilters}
          className="mt-5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          title="Reset filters"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
