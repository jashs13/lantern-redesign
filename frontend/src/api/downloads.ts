import { downloadUrl } from './client';

export interface EndpointCsvParams {
  fhir_versions?: string[];
  developer?: string;
  source?: string;
  availability?: string;
  search?: string;
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
  if (params?.developer) {
    parts.push(`developer=${encodeURIComponent(params.developer)}`);
  }
  if (params?.source && params.source !== 'true') {
    parts.push(`source=${encodeURIComponent(params.source)}`);
  }
  if (params?.availability) {
    parts.push(`availability=${encodeURIComponent(params.availability)}`);
  }
  if (params?.search) {
    parts.push(`search=${encodeURIComponent(params.search)}`);
  }

  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}

export interface OrganizationCsvParams {
  developer?: string;
  fhir_versions?: string[];
  identifier?: string;
  organization_detail?: string;
  state?: string;
  search?: string;
}

/**
 * Get the URL for downloading the organizations CSV export.
 */
export function getOrganizationsCsvUrl(params?: OrganizationCsvParams): string {
  const base = downloadUrl('/api/v1/downloads/organizations.csv');
  const parts: string[] = [];

  if (params?.developer) {
    parts.push(`developer=${encodeURIComponent(params.developer)}`);
  }
  if (params?.fhir_versions && params.fhir_versions.length > 0) {
    parts.push(`fhir_versions=${encodeURIComponent(params.fhir_versions.join(','))}`);
  }
  if (params?.identifier) {
    parts.push(`identifier=${encodeURIComponent(params.identifier)}`);
  }
  if (params?.organization_detail) {
    parts.push(`organization_detail=${encodeURIComponent(params.organization_detail)}`);
  }
  if (params?.state) {
    parts.push(`state=${encodeURIComponent(params.state)}`);
  }
  if (params?.search) {
    parts.push(`search=${encodeURIComponent(params.search)}`);
  }

  return parts.length > 0 ? `${base}?${parts.join('&')}` : base;
}
