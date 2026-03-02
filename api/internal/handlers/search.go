package handlers

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// Search performs cross-entity full-text search.
// Requires migration 000073 (search_vector columns on MVs and vendors table).
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		models.WriteJSON(w, http.StatusOK, models.SearchResponse{
			Endpoints:     []models.SearchResult{},
			Organizations: []models.SearchResult{},
			Vendors:       []models.SearchResult{},
		})
		return
	}

	tsQuery := buildTsQuery(q)
	if tsQuery == "" {
		models.WriteJSON(w, http.StatusOK, models.SearchResponse{
			Endpoints:     []models.SearchResult{},
			Organizations: []models.SearchResult{},
			Vendors:       []models.SearchResult{},
		})
		return
	}

	endpointPage := 1
	if p := r.URL.Query().Get("endpoint_page"); p != "" {
		fmt.Sscanf(p, "%d", &endpointPage)
		if endpointPage < 1 {
			endpointPage = 1
		}
	}

	orgPage := 1
	if p := r.URL.Query().Get("organization_page"); p != "" {
		fmt.Sscanf(p, "%d", &orgPage)
		if orgPage < 1 {
			orgPage = 1
		}
	}

	vendorPage := 1
	if p := r.URL.Query().Get("vendor_page"); p != "" {
		fmt.Sscanf(p, "%d", &vendorPage)
		if vendorPage < 1 {
			vendorPage = 1
		}
	}

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
		if limit < 1 || limit > 100 {
			limit = 10
		}
	}

	endpointOffset := (endpointPage - 1) * limit
	orgOffset := (orgPage - 1) * limit
	vendorOffset := (vendorPage - 1) * limit

	ctx := r.Context()
	var wg sync.WaitGroup
	var endpoints []models.SearchResult
	var orgs []models.SearchResult
	var vendors []models.SearchResult
	var endpointErr, orgErr, vendorErr error

	var endpointsTotal, orgsTotal, vendorsTotal int

	wg.Add(3)

	go func() {
		defer wg.Done()
		endpoints, endpointsTotal, endpointErr = h.searchEndpoints(ctx, tsQuery, limit, endpointOffset)
	}()

	go func() {
		defer wg.Done()
		orgs, orgsTotal, orgErr = h.searchOrganizations(ctx, tsQuery, limit, orgOffset)
	}()

	go func() {
		defer wg.Done()
		vendors, vendorsTotal, vendorErr = h.searchVendors(ctx, tsQuery, limit, vendorOffset)
	}()

	wg.Wait()

	if endpointErr != nil {
		log.WithError(endpointErr).Warn("endpoint search failed")
	}
	if orgErr != nil {
		log.WithError(orgErr).Warn("organization search failed")
	}
	if vendorErr != nil {
		log.WithError(vendorErr).Warn("vendor search failed")
	}

	if endpoints == nil {
		endpoints = []models.SearchResult{}
	}
	if orgs == nil {
		orgs = []models.SearchResult{}
	}
	if vendors == nil {
		vendors = []models.SearchResult{}
	}

	resp := models.SearchResponse{
		Endpoints:          endpoints,
		EndpointsTotal:     endpointsTotal,
		Organizations:      orgs,
		OrganizationsTotal: orgsTotal,
		Vendors:            vendors,
		VendorsTotal:       vendorsTotal,
		TotalCount:         endpointsTotal + orgsTotal + vendorsTotal,
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) searchEndpoints(ctx context.Context, tsQuery string, limit int, offset int) ([]models.SearchResult, int, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT url, COALESCE(vendor_name, ''), COALESCE(fhir_version, ''),
		        ts_rank(search_vector, to_tsquery('simple', $1)) AS rank,
		        COUNT(*) OVER() AS full_count
		 FROM fhir_endpoint_comb_mv
		 WHERE search_vector @@ to_tsquery('simple', $1)
		 ORDER BY rank DESC
		 LIMIT $2 OFFSET $3`, tsQuery, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.SearchResult
	var totalCount int
	for rows.Next() {
		var url, vendor, fhirVersion string
		var rank float64
		var fullCount int
		if err := rows.Scan(&url, &vendor, &fhirVersion, &rank, &fullCount); err != nil {
			continue
		}
		totalCount = fullCount
		desc := vendor
		if fhirVersion != "" {
			desc += " (" + fhirVersion + ")"
		}
		results = append(results, models.SearchResult{
			Type:        "endpoint",
			Name:        url,
			Description: &desc,
			URL:         &url,
			Rank:        rank,
		})
	}
	return results, totalCount, nil
}

func (h *Handler) searchOrganizations(ctx context.Context, tsQuery string, limit int, offset int) ([]models.SearchResult, int, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT organization_name, COALESCE(addresses_csv, ''), COALESCE(vendor_names_csv, ''),
		        ts_rank(search_vector, to_tsquery('simple', $1)) AS rank,
		        COUNT(*) OVER() AS full_count
		 FROM mv_organizations_final
		 WHERE search_vector @@ to_tsquery('simple', $1)
		 ORDER BY rank DESC
		 LIMIT $2 OFFSET $3`, tsQuery, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.SearchResult
	var totalCount int
	for rows.Next() {
		var name, address, vendors string
		var rank float64
		var fullCount int
		if err := rows.Scan(&name, &address, &vendors, &rank, &fullCount); err != nil {
			continue
		}
		totalCount = fullCount
		desc := address
		results = append(results, models.SearchResult{
			Type:        "organization",
			Name:        name,
			Description: &desc,
			Rank:        rank,
		})
	}
	return results, totalCount, nil
}

func (h *Handler) searchVendors(ctx context.Context, tsQuery string, limit int, offset int) ([]models.SearchResult, int, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT v.name, COUNT(DISTINCT ei.url) AS endpoint_count,
		        ts_rank(v.search_vector, to_tsquery('simple', $1)) AS rank,
		        COUNT(*) OVER() AS full_count
		 FROM vendors v
		 LEFT JOIN fhir_endpoints_info ei ON v.id = ei.vendor_id
		   AND ei.requested_fhir_version = 'None'
		 WHERE v.search_vector @@ to_tsquery('simple', $1)
		 GROUP BY v.id, v.name, v.search_vector
		 ORDER BY rank DESC
		 LIMIT $2 OFFSET $3`, tsQuery, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []models.SearchResult
	var totalCount int
	for rows.Next() {
		var name string
		var count int
		var rank float64
		var fullCount int
		if err := rows.Scan(&name, &count, &rank, &fullCount); err != nil {
			continue
		}
		totalCount = fullCount
		desc := fmt.Sprintf("%d endpoints", count)
		results = append(results, models.SearchResult{
			Type:        "vendor",
			Name:        name,
			Description: &desc,
			Rank:        rank,
		})
	}
	return results, totalCount, nil
}
