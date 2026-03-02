import { apiClient } from './client';
import type { SearchQueryParams, SearchResponse } from './types';

export async function fetchSearch(params: SearchQueryParams): Promise<SearchResponse> {
  return apiClient<SearchResponse>('/api/v1/search', {
    q: params.q,
    limit: params.limit,
    endpoint_page: params.endpoint_page,
    organization_page: params.organization_page,
    vendor_page: params.vendor_page,
  });
}
