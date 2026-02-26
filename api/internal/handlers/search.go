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

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
		if limit < 1 || limit > 50 {
			limit = 10
		}
	}

	ctx := r.Context()
	var wg sync.WaitGroup
	var endpoints []models.SearchResult
	var orgs []models.SearchResult
	var vendors []models.SearchResult
	var endpointErr, orgErr, vendorErr error

	wg.Add(3)

	go func() {
		defer wg.Done()
		endpoints, endpointErr = h.searchEndpoints(ctx, tsQuery, limit)
	}()

	go func() {
		defer wg.Done()
		orgs, orgErr = h.searchOrganizations(ctx, tsQuery, limit)
	}()

	go func() {
		defer wg.Done()
		vendors, vendorErr = h.searchVendors(ctx, tsQuery, limit)
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
		Endpoints:     endpoints,
		Organizations: orgs,
		Vendors:       vendors,
		TotalCount:    len(endpoints) + len(orgs) + len(vendors),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) searchEndpoints(ctx context.Context, tsQuery string, limit int) ([]models.SearchResult, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT url, COALESCE(vendor_name, ''), COALESCE(fhir_version, ''),
		        ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
		 FROM fhir_endpoint_comb_mv
		 WHERE search_vector @@ to_tsquery('simple', $1)
		 ORDER BY rank DESC
		 LIMIT $2`, tsQuery, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.SearchResult
	for rows.Next() {
		var url, vendor, fhirVersion string
		var rank float64
		if err := rows.Scan(&url, &vendor, &fhirVersion, &rank); err != nil {
			continue
		}
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
	return results, nil
}

func (h *Handler) searchOrganizations(ctx context.Context, tsQuery string, limit int) ([]models.SearchResult, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT organization_name, COALESCE(addresses_csv, ''), COALESCE(vendor_names_csv, ''),
		        ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
		 FROM mv_organizations_final
		 WHERE search_vector @@ to_tsquery('simple', $1)
		 ORDER BY rank DESC
		 LIMIT $2`, tsQuery, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.SearchResult
	for rows.Next() {
		var name, address, vendors string
		var rank float64
		if err := rows.Scan(&name, &address, &vendors, &rank); err != nil {
			continue
		}
		desc := address
		results = append(results, models.SearchResult{
			Type:        "organization",
			Name:        name,
			Description: &desc,
			Rank:        rank,
		})
	}
	return results, nil
}

func (h *Handler) searchVendors(ctx context.Context, tsQuery string, limit int) ([]models.SearchResult, error) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT v.name, COUNT(DISTINCT ei.url) AS endpoint_count,
		        ts_rank(v.search_vector, to_tsquery('simple', $1)) AS rank
		 FROM vendors v
		 LEFT JOIN fhir_endpoints_info ei ON v.id = ei.vendor_id
		   AND ei.requested_fhir_version = 'None'
		 WHERE v.search_vector @@ to_tsquery('simple', $1)
		 GROUP BY v.id, v.name, v.search_vector
		 ORDER BY rank DESC
		 LIMIT $2`, tsQuery, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.SearchResult
	for rows.Next() {
		var name string
		var count int
		var rank float64
		if err := rows.Scan(&name, &count, &rank); err != nil {
			continue
		}
		desc := fmt.Sprintf("%d endpoints", count)
		results = append(results, models.SearchResult{
			Type:        "vendor",
			Name:        name,
			Description: &desc,
			Rank:        rank,
		})
	}
	return results, nil
}
