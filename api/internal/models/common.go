package models

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
)

// PaginatedResponse is the standard envelope for list endpoints.
type PaginatedResponse[T any] struct {
	Data       []T            `json:"data"`
	Pagination Pagination     `json:"pagination"`
	Filters    map[string]any `json:"filters_applied,omitempty"`
}

// Pagination holds page metadata.
type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalCount int `json:"total_count"`
	TotalPages int `json:"total_pages"`
}

// NewPagination constructs pagination metadata from total count.
func NewPagination(page, pageSize, totalCount int) Pagination {
	totalPages := 0
	if pageSize > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(pageSize)))
	}
	return Pagination{
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}
}

// ParsePagination extracts page and page_size from query params with defaults.
func ParsePagination(r *http.Request) (page, pageSize int) {
	page = parseIntDefault(r.URL.Query().Get("page"), 1)
	pageSize = parseIntDefault(r.URL.Query().Get("page_size"), 10)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 500 {
		pageSize = 500
	}
	return
}

// Offset calculates the SQL OFFSET from page and pageSize.
func Offset(page, pageSize int) int {
	return (page - 1) * pageSize
}

// WriteJSON writes a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// WriteError writes a JSON error response.
func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

// FieldMetrics aggregates KPI metrics for capability statement fields.
type FieldMetrics struct {
	RequiredCount     int  `json:"required_count"`
	OptionalCount     *int `json:"optional_count"`
	AveragePerCapStat *int `json:"average_per_cap_stat"`
	ExtensionCount    *int `json:"extension_count"`
}

// FieldValueMetrics aggregates average KPIs for the Field Values tab.
type FieldValueMetrics struct {
	FieldsWithValues  *int     `json:"fields_with_values"`
	TotalUniqueValues *int     `json:"total_unique_values"`
	MostUniformField  *string  `json:"most_uniform_field"`
	MostUniformScore  *float64 `json:"most_uniform_score"`
	MostVariedField   *string  `json:"most_varied_field"`
	MostVariedScore   *int     `json:"most_varied_score"`
}

// ValidationMetrics aggregates static KPIs for the Validation Results tab.
type ValidationMetrics struct {
	PassingAll     *int     `json:"passing_all"`
	WithFailures   *int     `json:"with_failures"`
	PassRate       *float64 `json:"pass_rate"`
	TotalRules     *int     `json:"total_rules"`
	MostFailedRule *string  `json:"most_failed_rule"`
	MaxFailures    *int     `json:"max_failures"`
}

// SmartKPIMetrics aggregates static KPIs for the SMART-on-FHIR Capabilities tab.
type SmartKPIMetrics struct {
	WellKnownSupported   *int     `json:"well_known_supported"`
	NotSupported         *int     `json:"not_supported"`
	MostCommonCapability *string  `json:"most_common_capability"`
	MostCommonCount      *int     `json:"most_common_count"`
	AvgCapabilities      *float64 `json:"avg_capabilities"`
}

// SmartSankeyMetrics holds all counts and percentages for the SMART-on-FHIR Sankey diagram.
type SmartSankeyMetrics struct {
	TotalIndexed   *int     `json:"total_indexed"`
	Http200        *int     `json:"http200"`
	NoHttp200      *int     `json:"no_http200"`
	WellKnown      *int     `json:"well_known"`
	NonWellKnown   *int     `json:"non_well_known"`
	ValidJson      *int     `json:"valid_json"`
	NoValidJson    *int     `json:"no_valid_json"`
	Http200Pct        *float64 `json:"http200_pct"`
	NoHttp200Pct      *float64 `json:"no_http200_pct"`
	WellKnownPct      *float64 `json:"well_known_pct"`
	NonWellKnownPct   *float64 `json:"non_well_known_pct"`
	ValidJsonPct      *float64 `json:"valid_json_pct"`
	NoValidJsonPct    *float64 `json:"no_valid_json_pct"`
}

