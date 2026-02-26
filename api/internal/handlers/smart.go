package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// SmartResponse returns paginated SMART response endpoint data.
func (h *Handler) SmartResponse(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf("(url ILIKE $%d OR vendor_name ILIKE $%d)", argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM mv_well_known_endpoints %s", whereClause),
		args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(
		`SELECT url, vendor_name, fhir_version, smart_http_response
		 FROM mv_well_known_endpoints %s
		 ORDER BY url
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying SMART endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch SMART data")
		return
	}
	defer rows.Close()

	var endpoints []models.SmartEndpoint
	for rows.Next() {
		var ep models.SmartEndpoint
		if err := rows.Scan(&ep.URL, &ep.VendorName, &ep.FHIRVersion, &ep.SMARTHTTPResponse); err != nil {
			continue
		}
		endpoints = append(endpoints, ep)
	}
	if endpoints == nil {
		endpoints = []models.SmartEndpoint{}
	}

	resp := models.PaginatedResponse[models.SmartEndpoint]{
		Data:       endpoints,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// SmartResponseSummary returns SMART response aggregation data.
func (h *Handler) SmartResponseSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var summary models.SmartSummaryData

	// Well-known URI summary
	wkRows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT vendor_name, fhir_version,
			SUM(CASE WHEN smart_http_response = 200 THEN 1 ELSE 0 END) AS http_200_count,
			COUNT(*) AS total_count
		 FROM mv_well_known_endpoints %s
		 GROUP BY vendor_name, fhir_version
		 ORDER BY vendor_name`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying SMART summary")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch SMART summary")
		return
	}
	defer wkRows.Close()

	for wkRows.Next() {
		var s models.WellKnownSummary
		if err := wkRows.Scan(&s.VendorName, &s.FHIRVersion, &s.HTTP200Count, &s.TotalCount); err != nil {
			continue
		}
		summary.WellKnownSummary = append(summary.WellKnownSummary, s)
	}
	if summary.WellKnownSummary == nil {
		summary.WellKnownSummary = []models.WellKnownSummary{}
	}

	// SMART capabilities
	capRows, err := h.db.QueryContext(ctx,
		`SELECT capability, count FROM mv_smart_response_capabilities ORDER BY count DESC`)
	if err == nil {
		defer capRows.Close()
		for capRows.Next() {
			var c models.SmartCapability
			if err := capRows.Scan(&c.Capability, &c.Count); err != nil {
				continue
			}
			summary.CapabilityCounts = append(summary.CapabilityCounts, c)
		}
	}
	if summary.CapabilityCounts == nil {
		summary.CapabilityCounts = []models.SmartCapability{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}
