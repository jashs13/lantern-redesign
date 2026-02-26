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
	URL                   string                  `json:"url"`
	EndpointNames         *string                 `json:"endpoint_names"`
	VendorName            *string                 `json:"vendor_name"`
	FHIRVersion           *string                 `json:"fhir_version"`
	CapabilityFHIRVersion *string                 `json:"capability_fhir_version"`
	Format                *string                 `json:"format"`
	HTTPResponse          *int                    `json:"http_response"`
	ResponseTimeSeconds   *float64                `json:"response_time_seconds"`
	SMARTHTTPResponse     *int                    `json:"smart_http_response"`
	Availability          *float64                `json:"availability"`
	Status                *string                 `json:"status"`
	TLSVersion            *string                 `json:"tls_version"`
	MIMETypes             *string                 `json:"mime_types"`
	CapabilityStatement   *string                 `json:"capability_statement"`
	SMARTResponse         *string                 `json:"smart_response"`
	Organizations         []EndpointOrganization  `json:"organizations"`
	Products              []EndpointProduct       `json:"products"`
	IncludedFields        *string                 `json:"included_fields"`
	OperationResource     *string                 `json:"operation_resource"`
}

// EndpointOrganization represents an organization linked to an endpoint.
type EndpointOrganization struct {
	OrganizationNPIID string  `json:"organization_npi_id"`
	OrganizationName  *string `json:"organization_name"`
	Confidence        *int    `json:"confidence"`
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
