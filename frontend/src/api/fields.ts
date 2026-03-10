import { apiClient } from './client';
import type {
  Field,
  FieldQueryParams,
  FieldValue,
  FieldValueQueryParams,
  FieldValueSummary,
  FieldValueSummaryQueryParams,
  PaginatedResponse,
  FieldMetrics
} from './types';

export async function fetchFields(
  params?: FieldQueryParams,
): Promise<Field[]> {
  return apiClient<Field[]>('/api/v1/fields', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    search: params?.search,
    is_extension: params?.is_extension,
  });
}

export async function fetchFieldMetrics(): Promise<FieldMetrics> {
  return apiClient<FieldMetrics>('/api/v1/fields/metrics');
}

export async function fetchFieldValues(
  params?: FieldValueQueryParams,
): Promise<PaginatedResponse<FieldValue>> {
  return apiClient<PaginatedResponse<FieldValue>>('/api/v1/field-values', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    field: params?.field,
    search: params?.search,
  });
}

export async function fetchFieldValueSummary(
  params?: FieldValueSummaryQueryParams,
): Promise<FieldValueSummary[]> {
  return apiClient<FieldValueSummary[]>('/api/v1/field-value-summary', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    field: params?.field,
  });
}
