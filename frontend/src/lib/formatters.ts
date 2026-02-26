/**
 * Format a number with locale-aware thousands separators.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
}

/**
 * Format a date string (ISO or epoch) to a human-readable local string.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

/**
 * Format a decimal as a percentage string.
 * @param value - decimal between 0-1 or 0-100
 * @param decimals - number of decimal places
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value === null || value === undefined) return '—';
  // If the value appears to be 0-1 range, multiply by 100
  const pct = value <= 1 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format seconds into a human-readable duration.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format an HTTP status code with a description.
 */
export function formatHttpStatus(code: number | null | undefined): string {
  if (code === null || code === undefined) return '—';
  const descriptions: Record<number, string> = {
    200: 'OK',
    301: 'Moved',
    302: 'Found',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Unavailable',
  };
  return `${code} ${descriptions[code] || ''}`.trim();
}
