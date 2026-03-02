import { apiClient } from './client';
import type {
  Endpoint,
  EndpointDetail,
  EndpointQueryParams,
  HTTPHistoryPoint,
  ResponseTimePoint,
} from './types';
import { encodeUrlPathParam } from '@/lib/url';

export async function fetchEndpoints(
  params?: EndpointQueryParams,
): Promise<Endpoint[]> {
  return apiClient<Endpoint[]>('/api/v1/endpoints', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    availability: params?.availability,
    source: params?.source,
    search: params?.search,
    q: params?.q,
    sort_by: params?.sort_by,
    sort_dir: params?.sort_dir,
  });
}

export async function fetchEndpointsCount(
  params?: Omit<EndpointQueryParams, 'page' | 'page_size' | 'sort_by' | 'sort_dir'>,
): Promise<number> {
  const result = await apiClient<{ total_count: number }>('/api/v1/endpoints/count', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    availability: params?.availability,
    source: params?.source,
    search: params?.search,
    q: params?.q,
  });
  return result.total_count;
}

export async function fetchEndpointDetails(url: string): Promise<EndpointDetail> {
  return apiClient<EndpointDetail>(`/api/v1/endpoints/${encodeUrlPathParam(url)}/details`);
}

export async function fetchEndpointResponseTime(url: string): Promise<ResponseTimePoint[]> {
  return apiClient<ResponseTimePoint[]>(
    `/api/v1/endpoints/${encodeUrlPathParam(url)}/response-time`,
  );
}

export async function fetchEndpointHTTPHistory(url: string): Promise<HTTPHistoryPoint[]> {
  return apiClient<HTTPHistoryPoint[]>(
    `/api/v1/endpoints/${encodeUrlPathParam(url)}/http-history`,
  );
}
