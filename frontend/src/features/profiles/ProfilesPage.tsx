import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchProfiles } from '@/api/profiles';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { fetchFHIRVersions, fetchVendors, fetchFilterResources, fetchFilterProfiles } from '@/api/filters';
import type { Profile } from '@/api/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Profile, unknown>[] = [
  {
    accessorKey: 'url',
    header: 'Endpoint',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm text-navy-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'profile_name',
    header: 'Profile Name',
    cell: ({ getValue }) => (
      <span className="font-semibold text-neutral-700">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'profile_url',
    header: 'Profile URL',
    cell: ({ getValue }) => {
      const url = getValue() as string | null;
      return url ? (
        <span className="font-mono text-xs text-neutral-500" style={{ wordBreak: 'break-all' }}>{url}</span>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'resource',
    header: 'Resource',
    cell: ({ getValue }) => {
      const resource = getValue() as string | null;
      return resource ? (
        <Badge variant="info" className="whitespace-nowrap">{resource}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'vendor_name',
    header: 'Developer',
    cell: ({ getValue }) => {
      const vendor = getValue() as string | null;
      return vendor ? (
        <Badge variant="navy" className="whitespace-nowrap">{vendor}</Badge>
      ) : (
        <span className="text-neutral-400">—</span>
      );
    },
  },
  {
    accessorKey: 'fhir_version',
    header: 'FHIR Version',
    cell: ({ getValue }) => {
      const ver = getValue() as string | null;
      if (!ver) return '—';
      return <Badge variant={ver.startsWith('4.0') ? 'fhir-r4' : 'fhir'}>{ver}</Badge>;
    },
  },
];

export default function ProfilesPage() {
  const { filters, setFhirVersions, setVendor } = useFilters();
  const { page, setPage, pageSize } = usePagination(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  // Local filters
  const [resource, setResource] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);

  // Filter option hooks
  const { data: fhirVersions = [] } = useQuery({
    queryKey: ['filters', 'fhir-versions'],
    queryFn: fetchFHIRVersions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['filters', 'vendors'],
    queryFn: fetchVendors,
    staleTime: 10 * 60 * 1000,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['filters', 'resources'],
    queryFn: fetchFilterResources,
    staleTime: 10 * 60 * 1000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['filters', 'profiles'],
    queryFn: fetchFilterProfiles,
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles', page, pageSize, filters.fhirVersions, filters.vendor, resource, profile, debouncedSearch],
    queryFn: () =>
      fetchProfiles({
        page,
        page_size: pageSize,
        fhir_versions: filters.fhirVersions,
        vendor: filters.vendor || undefined,
        resource: resource || undefined,
        profile: profile || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profiles"
        subtitle="FHIR profiles declared by endpoint capability statements"
        breadcrumbs={[{ label: 'Profiles' }]}
      />

      {/* Search + Filters Card */}
      <section
        className="rounded-md bg-white"
        style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
        aria-label="Search and filter profiles"
      >
        {/* Search row */}
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by profile name, URL, or resource..."
            className="max-w-md"
          />
        </div>

        {/* Filter dropdowns grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              FHIR Version
            </label>
            <Select
              value={filters.fhirVersions[0] ?? '__all__'}
              onValueChange={(v) => { setFhirVersions(v === '__all__' ? [] : [v]); setPage(1); }}
              options={[{ value: '__all__', label: 'All Versions' }, ...fhirVersions.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Versions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              EHR Developer
            </label>
            <Select
              value={filters.vendor ?? '__all__'}
              onValueChange={(v) => { setVendor(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Developers' }, ...vendors.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Developers"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Resource
            </label>
            <Select
              value={resource ?? '__all__'}
              onValueChange={(v) => { setResource(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Resources' }, ...resources.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Resources"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-sans font-bold uppercase"
              style={{ fontSize: '0.8125rem', color: 'var(--color-gray-dark)', letterSpacing: '0.03em' }}
            >
              Profile
            </label>
            <Select
              value={profile ?? '__all__'}
              onValueChange={(v) => { setProfile(v === '__all__' ? null : v); setPage(1); }}
              options={[{ value: '__all__', label: 'All Profiles' }, ...profiles.map(o => ({ value: o.value, label: o.value }))]}
              placeholder="All Profiles"
            />
          </div>
        </div>
      </section>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        totalCount={data?.pagination.total_count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
