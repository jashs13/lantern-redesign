// =============================================================================
// Generic pagination envelope
// =============================================================================

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// =============================================================================
// Dashboard
// =============================================================================

export interface DashboardSummary {
  totals: EndpointTotals;
  response_tally: ResponseTally;
  vendor_counts: VendorFHIRCount[];
  http_codes: HTTPCodeCount[];
  top_organizations?: string[];
  dev_summary?: DevSummary[];
  daily_stats?: DailyStats[];
}

export interface EndpointTotals {
  all_endpoints: number;
  indexed_endpoints: number;
  non_indexed_endpoints: number;
  organizations: number;
  last_updated: string;
  avg_response_time?: number;
}

export interface ResponseTally {
  http_200: number;
  http_404: number;
  http_503: number;
}

export interface VendorFHIRCount {
  vendor_name: string;
  fhir_version: string;
  count: number;
  sort_order: number;
}

export interface HTTPCodeCount {
  http_code: number;
  code_label: string;
  count_endpoints: number;
}

export interface DevSummary {
  vendor_name: string;
  endpoint_count: number;
  org_count: number;
  available_count: number;
  degraded_count: number;
  down_count: number;
  available_pct: number;
  degraded_pct: number;
  down_pct: number;
  avg_response_time_ms: number;
  sort_order: number;
}

export interface DailyStats {
  stat_date: string;
  total_queries: number;
  http_2xx: number;
  http_3xx: number;
  http_4xx: number;
  http_5xx: number;
  http_timeout: number;
  available_pct: number;
  avg_response_time_ms: number;
}

// =============================================================================
// Endpoints
// =============================================================================

export interface Endpoint {
  url: string;
  endpoint_names: string | null;
  vendor_name: string | null;
  list_source: string | null;
  capability_fhir_version: string | null;
  fhir_version: string | null;
  format: string | null;
  http_response: number | null;
  response_time_seconds: number | null;
  smart_http_response: number | null;
  errors: string | null;
  availability: number | null;
  kind: string | null;
  requested_fhir_version: string | null;
  is_chpl: string | null;
  status: string | null;
  cap_stat_exists: string | null;
}

export interface EndpointDetail {
  url: string;
  endpoint_names: string | null;
  vendor_name: string | null;
  fhir_version: string | null;
  capability_fhir_version: string | null;
  format: string | null;
  http_response: number | null;
  response_time_seconds: number | null;
  smart_http_response: number | null;
  availability: number | null;
  status: string | null;
  tls_version: string | null;
  mime_types: string | null;
  capability_statement: string | null;
  smart_response: string | null;
  organizations: EndpointOrganization[];
  products: EndpointProduct[];
  included_fields: string | null;
  operation_resource: string | null;
  list_source: string | null;
  software_name: string | null;
  software_version: string | null;
  security: string | null;
  implementation_guides: string[];
  supported_profiles: EndpointProfile[];
  capability_fields: CapabilityField[];
  operation_resources: OperationResource[];
  smart_capabilities: string[];
}

export interface EndpointOrganization {
  organization_name: string;
}

export interface EndpointProfile {
  profile_url: string;
  profile_name: string | null;
  resource: string | null;
}

export interface CapabilityField {
  field_name: string;
  exists: boolean;
  is_extension: boolean;
}

export interface OperationResource {
  operation: string;
  resource: string;
}

export interface EndpointProduct {
  name: string;
  version: string | null;
  api_url: string | null;
  certification_status: string | null;
  certification_date: string | null;
  certification_edition: string | null;
  chpl_id: string | null;
  last_modified_in_chpl: string | null;
}

export interface ResponseTimePoint {
  time: number;
  response: number;
}

export interface HTTPHistoryPoint {
  time: number;
  http_response: number;
}

// =============================================================================
// Organizations
// =============================================================================

export interface Organization {
  organization_name: string;
  identifier_type: string | null;
  identifier_value: string | null;
  address: string | null;
  org_url: string | null;
  endpoint_url: string | null;
  fhir_version: string | null;
  vendor_name: string | null;
}

// =============================================================================
// Search
// =============================================================================

export interface SearchQueryParams {
  q: string;
  limit?: number;
  endpoint_page?: number;
  organization_page?: number;
  vendor_page?: number;
}

export interface SearchResponse {
  endpoints: SearchResult[];
  endpoints_total: number;
  organizations: SearchResult[];
  organizations_total: number;
  vendors: SearchResult[];
  vendors_total: number;
  total_count: number;
}

export interface SearchResult {
  type: 'endpoint' | 'organization' | 'vendor';
  name: string;
  description?: string;
  url?: string;
  rank: number;
}

// =============================================================================
// Resources
// =============================================================================

export interface Resource {
  resource_type: string;
  fhir_versions: string[];
  endpoint_count: number;
  read_search_count: number;
  support_percent: number;
  read_search_percent: number;
  category: string;
}

export interface ResourceStats {
  distinct_resources: number;
  avg_per_endpoint: number;
  most_supported_resource: string;
  most_supported_percent: number;
  uscdi_coverage_percent: number;
}

export interface ResourceOperationSupport {
  resource_type: string;
  operation: string;
  endpoint_count: number;
  support_percent: number;
}

// =============================================================================
// Fields & Field Values
// =============================================================================

export interface Field {
  field_name: string;
  fhir_version: string;
  count: number;
  is_required: boolean;
}

export interface FieldMetrics {
  required_count: number | null;
  optional_count: number | null;
  average_per_cap_stat: number | null;
  extension_count: number | null;
}

export interface FieldValueMetrics {
  fields_with_values: number | null;
  total_unique_values: number | null;
  most_uniform_field: string | null;
  most_uniform_score: number | null;
  most_varied_field: string | null;
  most_varied_score: number | null;
}

export interface ValidationMetrics {
  passing_all: number | null;
  with_failures: number | null;
  pass_rate: number | null;
  total_rules: number | null;
  most_failed_rule: string | null;
  max_failures: number | null;
}

export interface FieldValue {
  field_name: string;
  field_value: string;
  fhir_version: string;
  endpoint_count: number;
}

export interface FieldValueSummary {
  is_used: string;
  count: number;
}

// =============================================================================
// Profiles
// =============================================================================

export interface Profile {
  url: string;
  profile_url: string | null;
  profile_name: string | null;
  resource: string | null;
  vendor_name: string | null;
  fhir_version: string | null;
}

export interface ProfileChartItem {
  name: string;
  profile_url: string;
  endpoint_count: number;
}

export interface ProfileStats {
  distinct_profiles: number;
  us_core_profiles: number;
  endpoints_with_profiles: number;
  avg_profiles_per_endpoint: number;
}

export interface ProfileAdoptionItem {
  profile_url: string;
  profile_name: string;
  endpoint_count: number;
  adoption_pct: number;
}

// =============================================================================
// CapStat Size
// =============================================================================

export interface CapStatSize {
  vendor_name: string;
  fhir_version: string;
  min: number | null;
  max: number | null;
  mean: number | null;
  std_dev: number | null;
  count: number;
}

export interface CapStatStats {
  avg_size: number;
  median_size: number;
  largest_size: number;
  smallest_size: number;
}

// =============================================================================
// Implementation Guides
// =============================================================================

export interface ImplementationGuide {
  name: string;
  fhir_version: string;
  count: number;
}

export interface IGStats {
  distinct_igs: number;
  endpoints_with_igs: number;
  endpoints_with_igs_pct: number;
  avg_igs_per_endpoint: number;
  most_adopted_name: string;
  most_adopted_count: number;
  most_adopted_pct: number;
}

// =============================================================================
// Validations
// =============================================================================

export interface ValidationSummary {
  rule_name: string;
  valid: number;
  invalid: number;
}

export interface ValidationDetail {
  rule_name: string;
  fhir_version: string;
}

export interface ValidationFailure {
  url: string;
  vendor_name: string | null;
  expected: string | null;
  actual: string | null;
  comment: string | null;
  fhir_version: string | null;
}

// =============================================================================
// Security
// =============================================================================

export interface SecurityEndpoint {
  url: string;
  org_names: string | null;
  vendor_name: string | null;
  fhir_version: string | null;
  tls_version: string | null;
  security_code: string | null;
  has_more_orgs: boolean;
}

export interface SecuritySummaryData {
  security_counts: SecurityCount[];
  auth_type_counts: AuthTypeCount[];
}

export interface SecurityCount {
  status: string;
  endpoints: number;
}

export interface AuthTypeCount {
  code: string;
  fhir_version: string;
  count: number;
}

// =============================================================================
// SMART Response
// =============================================================================

export interface SmartEndpoint {
  url: string;
  vendor_name: string | null;
  organization_names: string | null;
  fhir_version: string | null;
  smart_http_response: number | null;
}

export interface SmartSummaryData {
  total_indexed: number;
  http_200: number;
  smart_http_200: number;
  well_known_valid_doc: number;
  well_known_invalid_doc: number;
  capability_counts: SmartCapability[];
}

export interface SmartCapability {
  capability: string;
  count: number;
}

export interface SmartKPIMetrics {
  well_known_supported: number | null;
  not_supported: number | null;
  most_common_capability: string | null;
  most_common_count: number | null;
  avg_capabilities: number | null;
}

export interface SmartSankeyMetrics {
  total_indexed: number | null;
  http200: number | null;
  no_http200: number | null;
  well_known: number | null;
  non_well_known: number | null;
  valid_json: number | null;
  no_valid_json: number | null;
  http200_pct: number | null;
  no_http200_pct: number | null;
  well_known_pct: number | null;
  non_well_known_pct: number | null;
  valid_json_pct: number | null;
  no_valid_json_pct: number | null;
}

// =============================================================================
// Contacts
// =============================================================================

export interface Contact {
  url: string;
  vendor_name: string | null;
  fhir_version: string | null;
  contact_name: string | null;
  contact_type: string | null;
  contact_value: string | null;
}

// =============================================================================
// Filters
// =============================================================================

export interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

// =============================================================================
// Query parameter interfaces for API functions
// =============================================================================

export interface EndpointQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  availability?: string;
  source?: string;
  search?: string;
  q?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface OrganizationQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  search?: string;
  state?: string;
}

export interface ResourceQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  resources?: string[];
  operations?: string[];
  search?: string;
}

export interface SecurityQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  auth_type?: string;
  search?: string;
}

export interface SmartQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  search?: string;
}

export interface ValidationQueryParams {
  fhir_versions?: string[];
  vendor?: string;
  validation_group?: string;
}

export interface ValidationFailureQueryParams {
  rule_name: string;
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  validation_group?: string;
}

export interface ContactQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  has_contact?: 'true' | 'false';
  search?: string;
}

export interface ProfileQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  resource?: string;
  profile?: string;
  search?: string;
}

export interface FieldQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  search?: string;
  is_extension?: boolean;
}

export interface FieldValueQueryParams {
  page?: number;
  page_size?: number;
  fhir_versions?: string[];
  vendor?: string;
  field?: string;
  search?: string;
}

export interface FieldValueSummaryQueryParams {
  fhir_versions?: string[];
  vendor?: string;
  field?: string;
}

export interface SearchQueryParams {
  q: string;
  limit?: number;
}

export interface CapStatSizeQueryParams {
  fhir_versions?: string[];
  vendor?: string;
  page?: number;
  page_size?: number;
}

export interface ImplementationGuideQueryParams {
  fhir_versions?: string[];
  vendor?: string;
  page?: number;
  page_size?: number;
}
