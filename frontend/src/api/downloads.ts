import { downloadUrl } from './client';

/**
 * Get the URL for downloading the endpoints CSV export.
 */
export function getEndpointsCsvUrl(): string {
  return downloadUrl('/api/v1/downloads/endpoints.csv');
}

/**
 * Get the URL for downloading the organizations CSV export.
 */
export function getOrganizationsCsvUrl(): string {
  return downloadUrl('/api/v1/downloads/organizations.csv');
}
