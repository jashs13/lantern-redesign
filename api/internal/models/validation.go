package models

// ValidationSummary represents a row from mv_validation_results_plot.
type ValidationSummary struct {
	RuleName    string `json:"rule_name"`
	Valid       int    `json:"valid"`
	Invalid     int    `json:"invalid"`
	FHIRVersion string `json:"fhir_version"`
}

// ValidationDetail represents a row from mv_validation_details.
type ValidationDetail struct {
	RuleName    string  `json:"rule_name"`
	Description *string `json:"description"`
	Reference   *string `json:"reference"`
	Valid       int     `json:"valid"`
	Invalid     int     `json:"invalid"`
	FHIRVersion string  `json:"fhir_version"`
}

// ValidationFailure represents a row from the validation failures query.
type ValidationFailure struct {
	URL              string  `json:"url"`
	VendorName       *string `json:"vendor_name"`
	Expected         *string `json:"expected"`
	Actual           *string `json:"actual"`
	Comment          *string `json:"comment"`
	FHIRVersion      *string `json:"fhir_version"`
}
