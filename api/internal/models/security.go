package models

// SecurityEndpoint represents a row from security_endpoints_distinct_mv.
type SecurityEndpoint struct {
	URL            string  `json:"url"`
	VendorName     *string `json:"vendor_name"`
	FHIRVersion    *string `json:"fhir_version"`
	SecurityCode   *string `json:"security_code"`
	SecuritySystem *string `json:"security_system"`
}

// SecuritySummaryData combines security counts and auth type data.
type SecuritySummaryData struct {
	SecurityCounts []SecurityCount `json:"security_counts"`
	AuthTypeCounts []AuthTypeCount `json:"auth_type_counts"`
}

// SecurityCount from mv_endpoint_security_counts.
type SecurityCount struct {
	FHIRVersion string `json:"fhir_version"`
	HasSecurity int    `json:"has_security"`
	NoSecurity  int    `json:"no_security"`
}

// AuthTypeCount from mv_auth_type_count.
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

// Resource from mv_endpoint_resource_types or mv_resource_interactions.
type Resource struct {
	ResourceType  string `json:"resource_type"`
	FHIRVersion   string `json:"fhir_version"`
	EndpointCount int    `json:"endpoint_count"`
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

// Profile from mv_profiles_paginated.
type Profile struct {
	URL         string  `json:"url"`
	ProfileURL  *string `json:"profile_url"`
	ProfileName *string `json:"profile_name"`
	Resource    *string `json:"resource"`
	VendorName  *string `json:"vendor_name"`
	FHIRVersion *string `json:"fhir_version"`
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
