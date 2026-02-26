package models

// FilterOption represents a single selectable filter value.
type FilterOption struct {
	Value string `json:"value"`
	Label string `json:"label,omitempty"`
	Count *int   `json:"count,omitempty"`
}
