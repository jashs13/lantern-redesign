import { apiClient } from './client';
import type { SearchQueryParams, SearchResponse } from './types';

export async function fetchSearch(params: SearchQueryParams): Promise<SearchResponse> {
  return apiClient<SearchResponse>('/api/v1/search', {
    q: params.q,
    limit: params.limit,
  });
}
