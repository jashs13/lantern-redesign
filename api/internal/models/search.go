package models

// SearchResponse holds cross-entity search results.
type SearchResponse struct {
	Endpoints     []SearchResult `json:"endpoints"`
	Organizations []SearchResult `json:"organizations"`
	Vendors       []SearchResult `json:"vendors"`
	TotalCount    int            `json:"total_count"`
}

// SearchResult is a single search hit from any entity type.
type SearchResult struct {
	Type        string  `json:"type"` // "endpoint", "organization", "vendor"
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	URL         *string `json:"url,omitempty"`
	Rank        float64 `json:"rank"`
}
