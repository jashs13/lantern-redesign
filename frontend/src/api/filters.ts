import { apiClient } from './client';
import type { FilterOption } from './types';

export async function fetchVendors(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/vendors');
}

export async function fetchFHIRVersions(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/fhir-versions');
}

export async function fetchFilterResources(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/resources');
}

export async function fetchAuthTypes(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/auth-types');
}

export async function fetchFilterProfiles(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/profiles');
}

export async function fetchValidationGroups(): Promise<FilterOption[]> {
  return apiClient<FilterOption[]>('/api/v1/filters/validation-groups');
}
