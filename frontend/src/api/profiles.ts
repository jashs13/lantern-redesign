import { apiClient } from './client';
import type { PaginatedResponse, Profile, ProfileQueryParams } from './types';

export async function fetchProfiles(
  params?: ProfileQueryParams,
): Promise<PaginatedResponse<Profile>> {
  return apiClient<PaginatedResponse<Profile>>('/api/v1/profiles', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    resource: params?.resource,
    profile: params?.profile,
    search: params?.search,
  });
}
