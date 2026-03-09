package models

// Endpoint represents a row from fhir_endpoint_comb_mv.
type Endpoint struct {
	URL                   string   `json:"url"`
	EndpointNames         *string  `json:"endpoint_names"`
	InfoCreated           *string  `json:"info_created"`
	InfoUpdated           *string  `json:"info_updated"`
	ListSource            *string  `json:"list_source"`
	VendorName            *string  `json:"vendor_name"`
	CapabilityFHIRVersion *string  `json:"capability_fhir_version"`
	FHIRVersion           *string  `json:"fhir_version"`
	Format                *string  `json:"format"`
	HTTPResponse          *int     `json:"http_response"`
	ResponseTimeSeconds   *float64 `json:"response_time_seconds"`
	SMARTHTTPResponse     *int     `json:"smart_http_response"`
	Errors                *string  `json:"errors"`
	Availability          *float64 `json:"availability"`
	Kind                  *string  `json:"kind"`
	RequestedFHIRVersion  *string  `json:"requested_fhir_version"`
	IsChpl                *string  `json:"is_chpl"`
	Status                *string  `json:"status"`
	CapStatExists         *string  `json:"cap_stat_exists"`
}

// EndpointDetail holds full detail from multiple tables for a single endpoint.
type EndpointDetail struct {
	URL                   string             `json:"url"`
	EndpointNames         *string            `json:"endpoint_names"`
	VendorName            *string            `json:"vendor_name"`
	FHIRVersion           *string            `json:"fhir_version"`
	CapabilityFHIRVersion *string            `json:"capability_fhir_version"`
	Format                *string            `json:"format"`
	HTTPResponse          *int               `json:"http_response"`
	ResponseTimeSeconds   *float64           `json:"response_time_seconds"`
	SMARTHTTPResponse     *int               `json:"smart_http_response"`
	Availability          *float64           `json:"availability"`
	Status                *string            `json:"status"`
	TLSVersion            *string            `json:"tls_version"`
	MIMETypes             *string            `json:"mime_types"`
	CapabilityStatement   *string            `json:"capability_statement"`
	SMARTResponse         *string            `json:"smart_response"`
	Organizations         []EndpointOrganization `json:"organizations"`
	Products              []EndpointProduct      `json:"products"`
	IncludedFields        *string            `json:"included_fields"`
	OperationResource     *string            `json:"operation_resource"`
	ListSource            *string            `json:"list_source"`
	SoftwareName          *string            `json:"software_name"`
	SoftwareVersion       *string            `json:"software_version"`
	Security              *string            `json:"security"`
	ImplementationGuides  []string           `json:"implementation_guides"`
	SupportedProfiles     []EndpointProfile  `json:"supported_profiles"`
	CapabilityFields      []CapabilityField  `json:"capability_fields"`
	OperationResources    []OperationResource `json:"operation_resources"`
	SMARTCapabilities     []string           `json:"smart_capabilities"`
}

// EndpointOrganization represents an organization linked to an endpoint.
type EndpointOrganization struct {
	OrganizationName string `json:"organization_name"`
}

// CapabilityField represents a field entry from the included_fields JSON array.
type CapabilityField struct {
	FieldName   string `json:"field_name"`
	Exists      bool   `json:"exists"`
	IsExtension bool   `json:"is_extension"`
}

// OperationResource represents a FHIR operation mapped to a resource type.
type OperationResource struct {
	Operation string `json:"operation"`
	Resource  string `json:"resource"`
}

// EndpointProfile represents a supported profile declared in a capability statement.
type EndpointProfile struct {
	ProfileURL  string  `json:"profile_url"`
	ProfileName *string `json:"profile_name"`
	Resource    *string `json:"resource"`
}

// EndpointProduct represents a CHPL/HealthIT product linked to an endpoint.
type EndpointProduct struct {
	Name                string  `json:"name"`
	Version             *string `json:"version"`
	APIURL              *string `json:"api_url"`
	CertificationStatus *string `json:"certification_status"`
	CertificationDate   *string `json:"certification_date"`
	CertificationEdition *string `json:"certification_edition"`
	CHPLID              *string `json:"chpl_id"`
	LastModifiedInCHPL  *string `json:"last_modified_in_chpl"`
}

// ResponseTimePoint is a single data point in a response time series.
type ResponseTimePoint struct {
	Time     float64 `json:"time"`
	Response float64 `json:"response"`
}

// HTTPHistoryPoint is a single data point in an HTTP response history.
type HTTPHistoryPoint struct {
	Time         float64 `json:"time"`
	HTTPResponse int     `json:"http_response"`
}
