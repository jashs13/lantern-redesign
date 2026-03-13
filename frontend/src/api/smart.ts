import { apiClient } from './client';
import type {
  PaginatedResponse,
  SmartEndpoint,
  SmartQueryParams,
  SmartSummaryData,
  SmartKPIMetrics,
  SmartSankeyMetrics,
} from './types';

export async function fetchSmartResponse(
  params?: SmartQueryParams,
): Promise<PaginatedResponse<SmartEndpoint>> {
  return apiClient<PaginatedResponse<SmartEndpoint>>('/api/v1/smart-response', {
    page: params?.page,
    page_size: params?.page_size,
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
    search: params?.search,
  });
}

export async function fetchSmartSummary(params?: {
  fhir_versions?: string[];
  vendor?: string;
}): Promise<SmartSummaryData> {
  return apiClient<SmartSummaryData>('/api/v1/smart-response/summary', {
    fhir_versions: params?.fhir_versions,
    vendor: params?.vendor,
  });
}

export async function fetchSmartKPIMetrics(): Promise<SmartKPIMetrics> {
  return apiClient<SmartKPIMetrics>('/api/v1/smart-response/kpi');
}

export async function fetchSmartSankeyMetrics(): Promise<SmartSankeyMetrics> {
  return apiClient<SmartSankeyMetrics>('/api/v1/smart-response/sankey');
}
