import { apiClient } from './client';
import type {
  Endpoint,
  EndpointDetail,
  EndpointQueryParams,
  HTTPHistoryPoint,
  PaginatedResponse,
  ResponseTimePoint,
} from './types';
import { encodeUrlPathParam } from '@/lib/url';

export async function fetchEndpoints(
  params?: EndpointQueryParams,
): Promise<PaginatedResponse<Endpoint>> {
  return apiClient<PaginatedResponse<Endpoint>>('/api/v1/endpoints', {
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
