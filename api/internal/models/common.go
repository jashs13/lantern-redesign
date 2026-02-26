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
