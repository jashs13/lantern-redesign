import { apiClient } from './client';
import type {
  PaginatedResponse,
  ValidationDetail,
  ValidationFailure,
  ValidationFailureQueryParams,
  ValidationQueryParams,
  ValidationSummary,
  ValidationMetrics,
} from './types';

export async function fetchValidationsSummary(
  params?: ValidationQueryParams,
): Promise<ValidationSummary[]> {
  return apiClient<ValidationSummary[]>('/api/v1/validations/summary', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    validation_group: params?.validation_group,
  });
}

export async function fetchValidationsDetails(
  params?: ValidationQueryParams,
): Promise<ValidationDetail[]> {
  return apiClient<ValidationDetail[]>('/api/v1/validations/details', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    validation_group: params?.validation_group,
  });
}

export async function fetchValidationsFailures(
  params: ValidationFailureQueryParams,
): Promise<PaginatedResponse<ValidationFailure>> {
  return apiClient<PaginatedResponse<ValidationFailure>>('/api/v1/validations/failures', {
    rule_name: params.rule_name,
    page: params.page,
    page_size: params.page_size,
    fhir_versions: params.fhir_versions,
    vendor: params.vendor,
    validation_group: params.validation_group,
  });
}

export async function fetchValidationMetrics(): Promise<ValidationMetrics> {
  return apiClient<ValidationMetrics>('/api/v1/validations/metrics');
}
