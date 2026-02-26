import { apiClient } from './client';
import type { DashboardSummary } from './types';

export async function fetchDashboardSummary(params?: {
  fhir_versions?: string[];
  vendor?: string;
}): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>('/api/v1/dashboard/summary', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
  });
}
