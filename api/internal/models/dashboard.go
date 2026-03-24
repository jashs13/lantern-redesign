package models

// DashboardSummary combines all dashboard data.
type DashboardSummary struct {
	Totals           EndpointTotals    `json:"totals"`
	ResponseTally    ResponseTally     `json:"response_tally"`
	VendorCounts     []VendorFHIRCount `json:"vendor_counts"`
	HTTPCodes        []HTTPCodeCount   `json:"http_codes"`
	TopOrganizations []string          `json:"top_organizations"`
	DevSummary       []DevSummary      `json:"dev_summary"`
	DailyStats       []DailyStats      `json:"daily_stats"`
}

// EndpointTotals from mv_endpoint_totals.
type EndpointTotals struct {
	AllEndpoints        int     `json:"all_endpoints"`
	IndexedEndpoints    int     `json:"indexed_endpoints"`
	NonIndexedEndpoints int     `json:"non_indexed_endpoints"`
	Organizations       int     `json:"organizations"`
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

// DevSummary from mv_dashboard_dev_summary.
type DevSummary struct {
	VendorName      string  `json:"vendor_name"`
	EndpointCount   int     `json:"endpoint_count"`
	OrgCount        int     `json:"org_count"`
	AvailableCount  int     `json:"available_count"`
	DegradedCount   int     `json:"degraded_count"`
	DownCount       int     `json:"down_count"`
	AvailablePct    float64 `json:"available_pct"`
	DegradedPct     float64 `json:"degraded_pct"`
	DownPct         float64 `json:"down_pct"`
	AvgResponseTime int     `json:"avg_response_time_ms"`
	SortOrder       int     `json:"sort_order"`
}

// DailyStats from mv_dashboard_daily_stats.
type DailyStats struct {
	StatDate          string  `json:"stat_date"`
	TotalQueries      int     `json:"total_queries"`
	HTTP2xx           int     `json:"http_2xx"`
	HTTP3xx           int     `json:"http_3xx"`
	HTTP4xx           int     `json:"http_4xx"`
	HTTP5xx           int     `json:"http_5xx"`
	HTTPTimeout       int     `json:"http_timeout"`
	AvailablePct      float64 `json:"available_pct"`
	AvgResponseTimeMs float64 `json:"avg_response_time_ms"`
}
