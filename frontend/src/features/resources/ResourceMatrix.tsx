import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchResourceMatrix } from '@/api/resources';
import { Pagination } from '@/components/ui/Pagination';

const OPERATIONS: { key: string; label: string }[] = [
  { key: 'read',             label: 'Read' },
  { key: 'vread',            label: 'VRead' },
  { key: 'create',           label: 'Create' },
  { key: 'update',           label: 'Update' },
  { key: 'patch',            label: 'Patch' },
  { key: 'delete',           label: 'Delete' },
  { key: 'search-type',      label: 'Search' },
  { key: 'history-instance', label: 'History' },
];

// Mirrors CATEGORY_TO_RESOURCES in ResourcesPage.tsx
const CATEGORY_TO_RESOURCES: Record<string, string[]> = {
  Clinical: [
    'AllergyIntolerance', 'CarePlan', 'CareTeam', 'Condition', 'DiagnosticReport',
    'DocumentReference', 'Encounter', 'Goal', 'Immunization', 'MedicationAdministration',
    'MedicationRequest', 'Observation', 'Procedure', 'Provenance',
  ],
  Financial: [
    'Claim', 'ClaimResponse', 'Coverage', 'CoverageEligibilityRequest', 'ExplanationOfBenefit',
  ],
  Administrative: [
    'Device', 'Location', 'Organization', 'Patient', 'Practitioner',
    'PractitionerRole', 'RelatedPerson', 'Schedule', 'Slot',
  ],
  Foundation: [
    'CapabilityStatement', 'CodeSystem', 'ConceptMap', 'OperationDefinition',
    'SearchParameter', 'StructureDefinition', 'ValueSet',
  ],
};

function getCellStyle(pct: number): { background: string; color: string } {
  if (pct >= 80) return { background: '#10b981', color: '#fff' };
  if (pct >= 50) return { background: '#3b82f6', color: '#fff' };
  if (pct >= 20) return { background: '#f59e0b', color: '#fff' };
  if (pct >  0)  return { background: '#e5e7eb', color: '#6b7280' };
  return { background: 'transparent', color: '#d1d5db' };
}

const PAGE_SIZE = 25;

const LEGEND = [
  { color: '#10b981', label: 'High (≥80%)' },
  { color: '#3b82f6', label: 'Medium (50–79%)' },
  { color: '#f59e0b', label: 'Low (20–49%)' },
  { color: '#e5e7eb', label: 'Minimal (<20%)' },
];

const thBase: CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  color: 'var(--color-gray-dark)',
  background: '#f3f4f6',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdBase: CSSProperties = {
  padding: '0.375rem 0.5rem',
  textAlign: 'center',
  fontSize: '0.75rem',
  fontWeight: 600,
  borderBottom: '1px solid #f3f4f6',
  height: 32,
};

export function ResourceMatrix({
  category,
  search,
}: {
  category: string | null;
  search: string;
}) {
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['resource-matrix'],
    queryFn: fetchResourceMatrix,
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(() => {
    if (!rawData) return [];

    // Pivot flat rows → Map<resourceType, Map<operation, {count, pct}>>
    const map = new Map<string, Map<string, { count: number; pct: number }>>();
    for (const d of rawData) {
      if (!map.has(d.resource_type)) map.set(d.resource_type, new Map());
      map.get(d.resource_type)!.set(d.operation, {
        count: d.endpoint_count,
        pct: d.support_percent,
      });
    }

    return [...map.entries()]
      .map(([resourceType, ops]) => ({ resourceType, ops }))
      .filter((r) => {
        if (search && !r.resourceType.toLowerCase().includes(search.toLowerCase())) return false;
        if (category && !CATEGORY_TO_RESOURCES[category]?.includes(r.resourceType)) return false;
        return true;
      })
      .sort((a, b) => a.resourceType.localeCompare(b.resourceType));
  }, [rawData, search, category]);

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [category, search]);

  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div
        className="rounded-md bg-white"
        style={{ padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)', color: 'var(--color-gray)' }}
      >
        Loading matrix…
      </div>
    );
  }

  return (
    <div>
      {/* Table header: row count */}
      <div
        className="rounded-t-md"
        style={{
          background: '#f8f9fa',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
          Resource Operation Support Matrix
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray)' }}>
          Showing{' '}
          <strong>
            {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}
          </strong>
          {' '}of <strong>{totalCount}</strong> resource{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable matrix */}
      <div style={{ overflowX: 'auto', boxShadow: 'var(--shadow-sm)', borderRadius: '0 0 0.375rem 0.375rem' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
          <thead>
            <tr>
              <th
                style={{
                  ...thBase,
                  textAlign: 'left',
                  minWidth: 180,
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  background: '#f3f4f6',
                }}
              >
                Resource
              </th>
              {OPERATIONS.map((op) => (
                <th key={op.key} style={{ ...thBase, minWidth: 70, textAlign: 'center' }}>
                  {op.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.resourceType} style={{ transition: 'background 0.1s' }}>
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    color: '#1f2937',
                    position: 'sticky',
                    left: 0,
                    background: '#fafbfc',
                    borderRight: '1px solid #e5e7eb',
                    paddingLeft: '1rem',
                  }}
                >
                  {row.resourceType}
                </td>
                {OPERATIONS.map((op) => {
                  const cell = row.ops.get(op.key);
                  const style = cell ? getCellStyle(cell.pct) : getCellStyle(0);
                  return (
                    <td
                      key={op.key}
                      title={
                        cell
                          ? `${row.resourceType} / ${op.label}: ${cell.pct.toFixed(1)}% (${cell.count.toLocaleString()} endpoints)`
                          : `${row.resourceType} / ${op.label}: not reported`
                      }
                      style={{ ...tdBase, ...style }}
                    >
                      {cell ? `${cell.pct.toFixed(0)}%` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={OPERATIONS.length + 1}
                  style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-gray)', fontSize: '0.875rem' }}
                >
                  No resources match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '0.75rem' }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {LEGEND.map((l) => (
          <span
            key={l.label}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: l.color,
                display: 'inline-block',
                border: l.color === '#e5e7eb' ? '1px solid #d1d5db' : undefined,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
