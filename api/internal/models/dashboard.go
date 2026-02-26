package models

// DashboardSummary combines all dashboard data.
type DashboardSummary struct {
	Totals        EndpointTotals    `json:"totals"`
	ResponseTally ResponseTally     `json:"response_tally"`
	VendorCounts  []VendorFHIRCount `json:"vendor_counts"`
	HTTPCodes     []HTTPCodeCount   `json:"http_codes"`
}

// EndpointTotals from mv_endpoint_totals.
type EndpointTotals struct {
	AllEndpoints        int     `json:"all_endpoints"`
	IndexedEndpoints    int     `json:"indexed_endpoints"`
	NonIndexedEndpoints int     `json:"non_indexed_endpoints"`
	LastUpdated         string  `json:"last_updated"`
	AvgResponseTime     float64 `json:"avg_response_time"`
}

// ResponseTally from mv_response_tally.
type ResponseTally struct {
	HTTP200 int `json:"http_200"`
	HTTP404 int `json:"http_404"`
	HTTP503 int `json:"http_503"`
}

// VendorFHIRCount from mv_vendor_fhir_counts.
type VendorFHIRCount struct {
	VendorName  string `json:"vendor_name"`
	FHIRVersion string `json:"fhir_version"`
	Count       int    `json:"count"`
	SortOrder   int    `json:"sort_order"`
}

// HTTPCodeCount from mv_http_responses.
type HTTPCodeCount struct {
	HTTPCode       int    `json:"http_code"`
	CodeLabel      string `json:"code_label"`
	CountEndpoints int    `json:"count_endpoints"`
}
