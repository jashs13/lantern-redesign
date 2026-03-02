import { formatNumber } from '@/lib/formatters';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize = 25,
  onPageChange,
}: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Generate page numbers to display (max 7 visible)
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const btnBase: React.CSSProperties = {
    padding: '0.5rem 1rem',
    border: '2px solid var(--color-gray-lighter)',
    background: 'var(--color-white)',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    fontSize: '0.875rem',
    color: 'var(--color-gray-dark)',
    transition: 'all var(--transition-fast)',
  };

  const btnActiveStyle: React.CSSProperties = {
    ...btnBase,
    background: 'var(--color-primary)',
    color: 'var(--color-white)',
    borderColor: 'var(--color-primary)',
  };

  const btnDisabledStyle: React.CSSProperties = {
    ...btnBase,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <p className="font-sans text-sm" style={{ color: 'var(--color-gray)' }}>
        Showing{' '}
        <strong style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>{formatNumber(start)}</strong>
        {' – '}
        <strong style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>{formatNumber(end)}</strong>
        {' of '}
        <strong style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>{formatNumber(totalCount)}</strong>
        {' results'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={page <= 1 ? btnDisabledStyle : btnBase}
          aria-label="Previous page"
          onMouseEnter={(e) => {
            if (page > 1) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (page > 1) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-gray-lighter)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-gray-dark)';
            }
          }}
        >
          ← Previous
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2"
              style={{ color: 'var(--color-gray)' }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={p === page ? btnActiveStyle : btnBase}
              aria-current={p === page ? 'page' : undefined}
              onMouseEnter={(e) => {
                if (p !== page) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (p !== page) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-gray-lighter)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-gray-dark)';
                }
              }}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={page >= totalPages ? btnDisabledStyle : btnBase}
          aria-label="Next page"
          onMouseEnter={(e) => {
            if (page < totalPages) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (page < totalPages) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-gray-lighter)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-gray-dark)';
            }
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
