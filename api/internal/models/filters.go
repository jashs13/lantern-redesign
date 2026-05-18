package models

// FilterOption represents a single selectable filter value.
type FilterOption struct {
	Value string `json:"value"`
	Label string `json:"label,omitempty"`
	Count *int   `json:"count,omitempty"`
}

// ValidUSStates contains all valid 2-letter US state, territory, and district codes.
var ValidUSStates = map[string]bool{
	"AL": true, "AK": true, "AZ": true, "AR": true, "CA": true,
	"CO": true, "CT": true, "DE": true, "FL": true, "GA": true,
	"HI": true, "ID": true, "IL": true, "IN": true, "IA": true,
	"KS": true, "KY": true, "LA": true, "ME": true, "MD": true,
	"MA": true, "MI": true, "MN": true, "MS": true, "MO": true,
	"MT": true, "NE": true, "NV": true, "NH": true, "NJ": true,
	"NM": true, "NY": true, "NC": true, "ND": true, "OH": true,
	"OK": true, "OR": true, "PA": true, "RI": true, "SC": true,
	"SD": true, "TN": true, "TX": true, "UT": true, "VT": true,
	"VA": true, "WA": true, "WV": true, "WI": true, "WY": true,
	// Territories and district
	"DC": true, "PR": true, "VI": true, "GU": true, "AS": true,
	"MP": true,
}
