const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiClientError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Build a query string from a params object.
 * - Skips undefined/null/empty-string values.
 * - Joins arrays with commas.
 */
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Typed fetch wrapper for the Lantern API.
 *
 * @param path  - API path, e.g. `/api/v1/endpoints`
 * @param params - Optional query parameters
 * @returns Parsed JSON response of type T
 */
export async function apiClient<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const url = `${BASE_URL}${path}${buildQuery(params)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiClientError(response.status, response.statusText, body);
  }

  return response.json() as Promise<T>;
}

/**
 * Returns a full URL for direct downloads (CSV exports, etc.).
 *
 * @param path - API path to the download endpoint
 * @returns Absolute URL string
 */
export function downloadUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
