import { apiClient } from './client';
import type { PaginatedResponse, Resource, ResourceQueryParams, ResourceStats, ResourceOperationSupport } from './types';

export async function fetchResources(
  params?: ResourceQueryParams,
): Promise<PaginatedResponse<Resource>> {
  return apiClient<PaginatedResponse<Resource>>('/api/v1/resources', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    resources: params?.resources,
    operations: params?.operations,
    search: params?.search,
  });
}

export async function fetchResourcesChart(params?: {
  fhir_versions?: string[];
}): Promise<Resource[]> {
  return apiClient<Resource[]>('/api/v1/resources/chart', {
    fhir_versions: params?.fhir_versions,
  });
}

export async function fetchResourceStats(): Promise<ResourceStats> {
  return apiClient<ResourceStats>('/api/v1/resources/stats');
}

export async function fetchResourceMatrix(): Promise<ResourceOperationSupport[]> {
  return apiClient<ResourceOperationSupport[]>('/api/v1/resources/matrix');
}
