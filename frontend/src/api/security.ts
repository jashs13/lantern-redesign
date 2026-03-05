import { apiClient } from './client';
import type {
  PaginatedResponse,
  SecurityEndpoint,
  SecurityQueryParams,
  SecuritySummaryData,
} from './types';

export async function fetchSecurity(
  params?: SecurityQueryParams,
): Promise<PaginatedResponse<SecurityEndpoint>> {
  return apiClient<PaginatedResponse<SecurityEndpoint>>('/api/v1/security', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    auth_type: params?.auth_type,
    search: params?.search,
  });
}

export async function fetchSecuritySummary(params?: {
  fhir_versions?: string[];
}): Promise<SecuritySummaryData> {
  return apiClient<SecuritySummaryData>('/api/v1/security/summary', {
    fhir_versions: params?.fhir_versions,
  });
}

export async function fetchSecurityOrgs(url: string): Promise<string[]> {
  return apiClient<string[]>('/api/v1/security/orgs', { url });
}
