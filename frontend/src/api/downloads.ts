import { downloadUrl } from './client';

export interface EndpointCsvParams {
  fhir_versions?: string[];
  availability?: string;
}

/**
 * Get the URL for downloading the endpoints CSV export, with optional filters.
 */
export function getEndpointsCsvUrl(params?: EndpointCsvParams): string {
  const base = downloadUrl('/api/v1/downloads/endpoints.csv');
  const parts: string[] = [];

  if (params?.fhir_versions && params.fhir_versions.length > 0) {
    parts.push(`fhir_versions=${encodeURIComponent(params.fhir_versions.join(','))}`);
  }
  if (params?.availability) {
    parts.push(`availability=${encodeURIComponent(params.availability)}`);
  }

  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}

/**
 * Get the URL for downloading the organizations CSV export.
 */
export function getOrganizationsCsvUrl(): string {
  return downloadUrl('/api/v1/downloads/organizations.csv');
}
