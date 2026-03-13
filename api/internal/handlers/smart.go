package handlers

import (
	"database/sql"
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
		`SELECT url, vendor_name, fhir_version, organization_names, 200 AS smart_http_response
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
		if err := rows.Scan(&ep.URL, &ep.VendorName, &ep.FHIRVersion, &ep.OrganizationNames, &ep.SMARTHTTPResponse); err != nil {
			log.WithError(err).Error("failed to scan SMART endpoint row")
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

	// 1. Total Indexed Endpoints
	h.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(DISTINCT url) FROM mv_endpoint_export_tbl %s`, whereClause), args...).Scan(&summary.TotalIndexed)

	// Since whereClause either is "" or starts with "WHERE ", we need to safely append conditions
	andPrefix := "WHERE "
	if len(conditions) > 0 {
		andPrefix = " AND "
	}

	// 2. HTTP 200
	h.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(DISTINCT url) FROM mv_endpoint_export_tbl %s%shttp_response = 200`,
		whereClause, andPrefix), args...).Scan(&summary.Http200)

	// 3. SMART HTTP 200 (Well Known endpoints with HTTP 200)
	h.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(DISTINCT url) FROM mv_endpoint_export_tbl %s%ssmart_http_response = 200`,
		whereClause, andPrefix), args...).Scan(&summary.SmartHttp200)

	// 4. Well Known Valid JSON Document
	h.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM mv_well_known_endpoints %s`, whereClause), args...).Scan(&summary.WellKnownValidDoc)

	// 5. Well Known Invalid JSON Document
	h.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM mv_well_known_no_doc %s`, whereClause), args...).Scan(&summary.WellKnownInvalidDoc)

	// SMART capabilities
	capRows, err := h.db.QueryContext(ctx, fmt.Sprintf(`
		SELECT capability, COUNT(id) as count 
		FROM mv_smart_response_capabilities 
		%s
		GROUP BY capability 
		ORDER BY count DESC`, whereClause), args...)

	if err == nil {
		defer capRows.Close()
		for capRows.Next() {
			var c models.SmartCapability
			if err := capRows.Scan(&c.Capability, &c.Count); err != nil {
				continue
			}
			summary.CapabilityCounts = append(summary.CapabilityCounts, c)
		}
	} else {
		log.WithError(err).Error("querying SMART capabilities summary")
	}

	if summary.CapabilityCounts == nil {
		summary.CapabilityCounts = []models.SmartCapability{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}

// SmartKPIMetrics returns pre-computed SMART KPI metrics from the materialized view.
func (h *Handler) SmartKPIMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var metrics models.SmartKPIMetrics

	query := `SELECT well_known_supported, not_supported, most_common_capability, most_common_count, avg_capabilities
	          FROM smart_kpi_metrics_mv LIMIT 1`

	err := h.db.QueryRowContext(ctx, query).Scan(
		&metrics.WellKnownSupported,
		&metrics.NotSupported,
		&metrics.MostCommonCapability,
		&metrics.MostCommonCount,
		&metrics.AvgCapabilities,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// View empty or unpopulated — leave nil pointers.
		} else {
			log.WithError(err).Error("querying smart_kpi_metrics_mv")
			models.WriteError(w, http.StatusInternalServerError, "failed to fetch SMART KPI metrics")
			return
		}
	}

	models.WriteJSON(w, http.StatusOK, metrics)
}
