import { apiClient } from './client';
import type { Organization, OrganizationQueryParams } from './types';

export async function fetchOrganizations(
  params?: OrganizationQueryParams,
): Promise<Organization[]> {
  return apiClient<Organization[]>('/api/v1/organizations', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    search: params?.search,
    state: params?.state,
  });
}

export async function fetchOrganizationsCount(
  params?: Omit<OrganizationQueryParams, 'page' | 'page_size'>,
): Promise<number> {
  const result = await apiClient<{ total_count: number }>('/api/v1/organizations/count', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    search: params?.search,
    state: params?.state,
  });
  return result.total_count;
}
