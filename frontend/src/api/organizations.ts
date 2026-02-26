import { apiClient } from './client';
import type { Organization, OrganizationQueryParams, PaginatedResponse } from './types';

export async function fetchOrganizations(
  params?: OrganizationQueryParams,
): Promise<PaginatedResponse<Organization>> {
  return apiClient<PaginatedResponse<Organization>>('/api/v1/organizations', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    search: params?.search,
  });
}
