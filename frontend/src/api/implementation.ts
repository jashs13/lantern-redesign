import { apiClient } from './client';
import type {
  CapStatSize,
  CapStatSizeQueryParams,
  CapStatStats,
  IGStats,
  ImplementationGuide,
  ImplementationGuideQueryParams,
  PaginatedResponse,
} from './types';

export async function fetchImplementationGuides(
  params?: ImplementationGuideQueryParams,
): Promise<PaginatedResponse<ImplementationGuide>> {
  return apiClient<PaginatedResponse<ImplementationGuide>>('/api/v1/implementation-guides', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    page: params?.page,
    page_size: params?.page_size,
  });
}

export async function fetchIGStats(): Promise<IGStats> {
  return apiClient<IGStats>('/api/v1/implementation-guides/stats');
}

export async function fetchCapStatStats(): Promise<CapStatStats> {
  return apiClient<CapStatStats>('/api/v1/capstat-sizes/stats');
}

export async function fetchCapStatSizes(
  params?: CapStatSizeQueryParams,
): Promise<PaginatedResponse<CapStatSize>> {
  return apiClient<PaginatedResponse<CapStatSize>>('/api/v1/capstat-sizes', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    page: params?.page,
    page_size: params?.page_size,
  });
}
