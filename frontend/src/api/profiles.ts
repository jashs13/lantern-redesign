import { apiClient } from './client';
import type { PaginatedResponse, Profile, ProfileAdoptionItem, ProfileChartItem, ProfileQueryParams, ProfileStats } from './types';

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

export async function fetchProfilesChart(): Promise<ProfileChartItem[]> {
  return apiClient<ProfileChartItem[]>('/api/v1/profiles/chart');
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  return apiClient<ProfileStats>('/api/v1/profiles/stats');
}

export async function fetchProfileAdoption(
  params?: ProfileQueryParams,
): Promise<PaginatedResponse<ProfileAdoptionItem>> {
  return apiClient<PaginatedResponse<ProfileAdoptionItem>>('/api/v1/profiles/adoption', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    resource: params?.resource,
    search: params?.search,
  });
}
