import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/formatters';
import type { Resource } from '@/api/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'fhir-r4' | 'fhir' | 'navy';

const CATEGORY_VARIANT: Record<string, BadgeVariant> = {
  Clinical: 'success',
  Financial: 'info',
  Administrative: 'warning',
  Foundation: 'navy',
  Other: 'default',
};

function barColor(pct: number): string {
  if (pct >= 85) return 'var(--color-success, #2e8540)';
  if (pct >= 50) return 'var(--color-secondary, #02bfe7)';
  return 'var(--color-warning, #fdb81e)';
}

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const variant = CATEGORY_VARIANT[resource.category] ?? 'default';
  const pct = resource.support_percent ?? 0;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--color-gray-lighter, #d6d7d9)',
        borderRadius: '8px',
        padding: '1.25rem',
        transition: 'border-color 250ms ease, box-shadow 250ms ease, transform 250ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--color-primary-light, #051359)';
        el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--color-gray-lighter, #d6d7d9)';
        el.style.boxShadow = 'none';
        el.style.transform = 'none';
      }}
    >
      {/* Header: resource name + category badge */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className="font-mono font-bold"
          style={{ fontSize: '1rem', color: 'var(--color-primary-dark, #051359)', wordBreak: 'break-word' }}
        >
          {resource.resource_type}
        </span>
        <Badge variant={variant} className="shrink-0 whitespace-nowrap">
          {resource.category}
        </Badge>
      </div>

      {/* FHIR version badges */}
      {resource.fhir_versions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
          {resource.fhir_versions.map((v) => (
            <Badge
              key={v}
              variant={v.includes('4.0') || v.toUpperCase().includes('R4') ? 'fhir-r4' : 'fhir'}
            >
              {v}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          borderTop: '1px solid var(--color-gray-lighter, #d6d7d9)',
          borderBottom: '1px solid var(--color-gray-lighter, #d6d7d9)',
          marginBottom: '0.75rem',
        }}
      >
        <StatRow
          label="Endpoints Supporting"
          count={resource.endpoint_count}
          percent={resource.support_percent}
        />
        <StatRow
          label="Read + Search"
          count={resource.read_search_count}
          percent={resource.read_search_percent}
          noBorder
        />
      </div>

      {/* Support bar */}
      <div className="flex items-center gap-2">
        <div
          style={{
            flex: 1,
            height: '8px',
            borderRadius: '4px',
            background: 'var(--color-gray-lighter, #d6d7d9)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              borderRadius: '4px',
              background: barColor(pct),
              transition: 'width 300ms ease',
            }}
          />
        </div>
        <span
          className="font-mono font-semibold"
          style={{ fontSize: '0.75rem', color: 'var(--color-gray-dark)', minWidth: '3rem', textAlign: 'right' }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function StatRow({
  label,
  count,
  percent,
  noBorder = false,
}: {
  label: string;
  count: number;
  percent: number;
  noBorder?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={noBorder ? undefined : { borderBottom: '1px solid var(--color-gray-lighter, #d6d7d9)' }}
    >
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray)' }}>{label}</span>
      <span className="text-right">
        <span className="font-semibold" style={{ fontSize: '0.875rem', color: 'var(--color-gray-dark)' }}>
          {formatNumber(count)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-light)', marginLeft: '0.25rem' }}>
          ({percent.toFixed(1)}%)
        </span>
      </span>
    </div>
  );
}

export function ResourceCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{
        background: 'white',
        border: '1px solid var(--color-gray-lighter, #d6d7d9)',
        borderRadius: '8px',
        padding: '1.25rem',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div style={{ height: '1rem', width: '60%', background: '#e5e7eb', borderRadius: '4px' }} />
        <div style={{ height: '1.25rem', width: '4rem', background: '#e5e7eb', borderRadius: '9999px' }} />
      </div>
      <div style={{ borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: '0.75rem' }}>
        <div className="flex justify-between py-2">
          <div style={{ height: '0.8125rem', width: '45%', background: '#e5e7eb', borderRadius: '4px' }} />
          <div style={{ height: '0.8125rem', width: '30%', background: '#e5e7eb', borderRadius: '4px' }} />
        </div>
        <div className="flex justify-between py-2">
          <div style={{ height: '0.8125rem', width: '35%', background: '#e5e7eb', borderRadius: '4px' }} />
          <div style={{ height: '0.8125rem', width: '30%', background: '#e5e7eb', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px' }} />
    </div>
  );
}
