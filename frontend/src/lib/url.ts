/**
 * Encode an array of strings into a comma-separated URL param value.
 */
export function encodeArrayParam(values: string[]): string {
  return values.join(',');
}

/**
 * Decode a comma-separated URL param value into an array of strings.
 * Returns empty array for null/empty input.
 */
export function decodeArrayParam(value: string | null): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

/**
 * Encode a URL for use as a path parameter (double-encode slashes, etc.).
 */
export function encodeUrlPathParam(url: string): string {
  return encodeURIComponent(url);
}
