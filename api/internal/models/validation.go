package models

// ValidationSummary represents aggregated valid/invalid counts for a rule.
type ValidationSummary struct {
	RuleName string `json:"rule_name"`
	Valid    int    `json:"valid"`
	Invalid  int    `json:"invalid"`
}

// ValidationDetail represents a validation rule and the FHIR versions it applies to.
type ValidationDetail struct {
	RuleName    string `json:"rule_name"`
	FHIRVersion string `json:"fhir_version"`
}

// ValidationFailure represents a row from the validation failures query.
type ValidationFailure struct {
	URL         string  `json:"url"`
	VendorName  *string `json:"vendor_name"`
	Expected    *string `json:"expected"`
	Actual      *string `json:"actual"`
	FHIRVersion *string `json:"fhir_version"`
}
