import { apiClient } from './client';
import type { Field, FieldQueryParams, FieldValue, FieldValueQueryParams, PaginatedResponse } from './types';

export async function fetchFields(
  params?: FieldQueryParams,
): Promise<PaginatedResponse<Field>> {
  return apiClient<PaginatedResponse<Field>>('/api/v1/fields', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    search: params?.search,
  });
}

export async function fetchFieldValues(
  params?: FieldValueQueryParams,
): Promise<PaginatedResponse<FieldValue>> {
  return apiClient<PaginatedResponse<FieldValue>>('/api/v1/field-values', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    field_name: params?.field_name,
    search: params?.search,
  });
}
