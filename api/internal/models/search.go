package models

// SearchResponse holds cross-entity search results.
type SearchResponse struct {
	Endpoints          []SearchResult `json:"endpoints"`
	EndpointsTotal     int            `json:"endpoints_total"`
	Organizations      []SearchResult `json:"organizations"`
	OrganizationsTotal int            `json:"organizations_total"`
	Vendors            []SearchResult `json:"vendors"`
	VendorsTotal       int            `json:"vendors_total"`
	TotalCount         int            `json:"total_count"`
}

// SearchResult is a single search hit from any entity type.
type SearchResult struct {
	Type        string  `json:"type"` // "endpoint", "organization", "vendor"
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	URL         *string `json:"url,omitempty"`
	Rank        float64 `json:"rank"`
}
