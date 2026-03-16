package models

// SecurityEndpoint represents a row from security_endpoints_distinct_mv.
// Actual MV columns: url, condensed_organization_names, vendor_name,
// capability_fhir_version, tls_version, code
type SecurityEndpoint struct {
	URL          string  `json:"url"`
	OrgNames     *string `json:"org_names"`
	VendorName   *string `json:"vendor_name"`
	FHIRVersion  *string `json:"fhir_version"`
	TLSVersion   *string `json:"tls_version"`
	SecurityCode *string `json:"security_code"`
	HasMoreOrgs  bool    `json:"has_more_orgs"`
}

// SecuritySummaryData combines security counts and auth type data.
type SecuritySummaryData struct {
	SecurityCounts []SecurityCount `json:"security_counts"`
	AuthTypeCounts []AuthTypeCount `json:"auth_type_counts"`
}

// SecurityCount from mv_endpoint_security_counts.
// Actual MV columns: "Status" (text), "Endpoints" (int)
type SecurityCount struct {
	Status    string `json:"status"`
	Endpoints int    `json:"endpoints"`
}

// AuthTypeCount from mv_auth_type_count.
// Actual MV columns: "Code", "FHIR Version", "Endpoints", "Percent"
type AuthTypeCount struct {
	Code        string `json:"code"`
	FHIRVersion string `json:"fhir_version"`
	Count       int    `json:"count"`
}

// SmartEndpoint represents a row from the SMART response query.
type SmartEndpoint struct {
	URL               string  `json:"url"`
	VendorName        *string `json:"vendor_name"`
	OrganizationNames *string `json:"organization_names"`
	FHIRVersion       *string `json:"fhir_version"`
	SMARTHTTPResponse *int    `json:"smart_http_response"`
}

// SmartSummaryData holds SMART response aggregation data.
type SmartSummaryData struct {
	TotalIndexed        int               `json:"total_indexed"`
	Http200             int               `json:"http_200"`
	SmartHttp200        int               `json:"smart_http_200"`
	WellKnownValidDoc   int               `json:"well_known_valid_doc"`
	WellKnownInvalidDoc int               `json:"well_known_invalid_doc"`
	CapabilityCounts    []SmartCapability `json:"capability_counts"`
}

// SmartCapability from mv_smart_response_capabilities.
type SmartCapability struct {
	Capability string `json:"capability"`
	Count      int    `json:"count"`
}

// Contact from mv_contacts_info.
type Contact struct {
	URL          string  `json:"url"`
	VendorName   *string `json:"vendor_name"`
	FHIRVersion  *string `json:"fhir_version"`
	ContactName  *string `json:"contact_name"`
	ContactType  *string `json:"contact_type"`
	ContactValue *string `json:"contact_value"`
}

// Resource from mv_resource_interactions.
type Resource struct {
	ResourceType      string   `json:"resource_type"`
	FHIRVersions      []string `json:"fhir_versions"`
	EndpointCount     int      `json:"endpoint_count"`
	ReadSearchCount   int      `json:"read_search_count"`
	SupportPercent    float64  `json:"support_percent"`
	ReadSearchPercent float64  `json:"read_search_percent"`
	Category          string   `json:"category"`
}

// ResourceStats from mv_resource_stats.
type ResourceStats struct {
	DistinctResources     int     `json:"distinct_resources"`
	AvgPerEndpoint        float64 `json:"avg_per_endpoint"`
	MostSupportedResource string  `json:"most_supported_resource"`
	MostSupportedPercent  float64 `json:"most_supported_percent"`
	USCDICoveragePercent  float64 `json:"uscdi_coverage_percent"`
}

// ResourceOperationSupport from mv_resource_operation_support — one row per (resource, operation).
type ResourceOperationSupport struct {
	ResourceType   string  `json:"resource_type"`
	Operation      string  `json:"operation"`
	EndpointCount  int     `json:"endpoint_count"`
	SupportPercent float64 `json:"support_percent"`
}

// Field from mv_capstat_fields.
type Field struct {
	FieldName   string `json:"field_name"`
	FHIRVersion string `json:"fhir_version"`
	Count       int    `json:"count"`
	IsRequired  bool   `json:"is_required"`
}

// FieldValue from mv_capstat_values.
type FieldValue struct {
	FieldName     string `json:"field_name"`
	FieldValue    string `json:"field_value"`
	FHIRVersion   string `json:"fhir_version"`
	EndpointCount int    `json:"endpoint_count"`
}

// FieldValueSummary holds usage counts (yes/no) for a field.
type FieldValueSummary struct {
	IsUsed string `json:"is_used"`
	Count  int    `json:"count"`
}

// Profile from mv_profiles_paginated.
type Profile struct {
	URL         string  `json:"url"`
	ProfileURL  *string `json:"profile_url"`
	ProfileName *string `json:"profile_name"`
	Resource    *string `json:"resource"`
	VendorName  *string `json:"vendor_name"`
	FHIRVersion *string `json:"fhir_version"`
}

// ProfileChartItem — top profiles by distinct endpoint count.
type ProfileChartItem struct {
	Name          string `json:"name"`
	ProfileURL    string `json:"profile_url"`
	EndpointCount int    `json:"endpoint_count"`
}

// ProfileStats — aggregate statistics from mv_profile_stats.
type ProfileStats struct {
	DistinctProfiles       int     `json:"distinct_profiles"`
	USCoreProfiles         int     `json:"us_core_profiles"`
	EndpointsWithProfiles  int64   `json:"endpoints_with_profiles"`
	AvgProfilesPerEndpoint float64 `json:"avg_profiles_per_endpoint"`
}

// ProfileAdoptionItem — one row in the profile-centric adoption table.
type ProfileAdoptionItem struct {
	ProfileURL    string  `json:"profile_url"`
	ProfileName   string  `json:"profile_name"`
	EndpointCount int     `json:"endpoint_count"`
	AdoptionPct   float64 `json:"adoption_pct"`
}

// CapStatSize from mv_capstat_sizes_tbl.
type CapStatSize struct {
	VendorName  string   `json:"vendor_name"`
	FHIRVersion string   `json:"fhir_version"`
	Min         *float64 `json:"min"`
	Max         *float64 `json:"max"`
	Mean        *float64 `json:"mean"`
	StdDev      *float64 `json:"std_dev"`
	Count       int      `json:"count"`
}

// ImplementationGuide from the implementation guides query.
type ImplementationGuide struct {
	Name        string `json:"name"`
	FHIRVersion string `json:"fhir_version"`
	Count       int    `json:"count"`
}

// IGStats — aggregate statistics from mv_implementation_guide_stats.
type IGStats struct {
	DistinctIGs         int     `json:"distinct_igs"`
	EndpointsWithIGs    int     `json:"endpoints_with_igs"`
	EndpointsWithIGsPct float64 `json:"endpoints_with_igs_pct"`
	AvgIGsPerEndpoint   float64 `json:"avg_igs_per_endpoint"`
	MostAdoptedName     string  `json:"most_adopted_name"`
	MostAdoptedCount    int     `json:"most_adopted_count"`
	MostAdoptedPct      float64 `json:"most_adopted_pct"`
}

// CapStatStats — aggregate statistics from mv_capstat_stats.
type CapStatStats struct {
	AvgSize      int64 `json:"avg_size"`
	MedianSize   int64 `json:"median_size"`
	LargestSize  int64 `json:"largest_size"`
	SmallestSize int64 `json:"smallest_size"`
}
