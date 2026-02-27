package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// buildEndpointFilters parses the request query string and returns a WHERE clause,
// args slice, and next arg index. Shared by ListEndpoints and CountEndpoints.
func buildEndpointFilters(q map[string][]string) (whereClause string, args []any, hasConditions bool) {
	get := func(key string) string {
		if vals, ok := q[key]; ok && len(vals) > 0 {
			return vals[0]
		}
		return ""
	}

	var conditions []string
	argIdx := 1

	// FHIR version filter (comma-separated group names and/or literals like "No Cap Stat")
	if fv := get("fhir_versions"); fv != "" {
		raw := strings.Split(fv, ",")
		var versions []string
		for _, v := range raw {
			v = strings.TrimSpace(v)
			if v == "No Cap Stat" || v == "Unknown" {
				versions = append(versions, v)
			} else if group, ok := models.VersionGroupMap[v]; ok {
				versions = append(versions, group...)
			} else {
				versions = append(versions, v)
			}
		}
		if len(versions) > 0 {
			conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d)", argIdx))
			args = append(args, pqStringArray(versions))
			argIdx++
		}
	}

	// Vendor filter
	if vendor := get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	// Availability filter
	if avail := get("availability"); avail != "" {
		low, high := parseAvailabilityRange(avail)
		conditions = append(conditions, fmt.Sprintf("availability >= $%d AND availability <= $%d", argIdx, argIdx+1))
		args = append(args, low, high)
		argIdx += 2
	}

	// Source filter (CHPL)
	if source := get("source"); source != "" {
		switch strings.ToLower(source) {
		case "chpl":
			conditions = append(conditions, fmt.Sprintf("is_chpl = $%d", argIdx))
			args = append(args, "TRUE")
			argIdx++
		case "non-chpl":
			conditions = append(conditions, fmt.Sprintf("(is_chpl IS NULL OR is_chpl = $%d)", argIdx))
			args = append(args, "FALSE")
			argIdx++
		}
	}

	// Text search
	if search := get("search"); search != "" {
		pattern := "%" + search + "%"
		searchCols := []string{"url", "vendor_name", "endpoint_names", "fhir_version", "status"}
		var searchParts []string
		for _, col := range searchCols {
			searchParts = append(searchParts, fmt.Sprintf("LOWER(COALESCE(%s, '')) LIKE LOWER($%d)", col, argIdx))
		}
		conditions = append(conditions, "("+strings.Join(searchParts, " OR ")+")")
		args = append(args, pattern)
		argIdx++
	}

	// Full-text search
	if tsq := get("q"); tsq != "" {
		tsQuery := buildTsQuery(tsq)
		if tsQuery != "" {
			conditions = append(conditions, fmt.Sprintf("search_vector @@ to_tsquery('simple', $%d)", argIdx))
			args = append(args, tsQuery)
			argIdx++
		}
	}

	_ = argIdx // consumed above

	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
		hasConditions = true
	}
	return whereClause, args, hasConditions
}

// CountEndpoints returns only the total row count for a given filter set.
// The frontend caches this independently of the page number, so pagination
// page changes don't re-run the count query.
func (h *Handler) CountEndpoints(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := map[string][]string(r.URL.Query())
	whereClause, args, hasConditions := buildEndpointFilters(q)

	tx, err := h.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		log.WithError(err).Error("beginning transaction for count")
		models.WriteError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	if hasConditions {
		if _, err := tx.ExecContext(ctx, "SET LOCAL enable_seqscan=off"); err != nil {
			log.WithError(err).Warn("could not set enable_seqscan=off")
		}
	}

	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM fhir_endpoint_comb_mv %s", whereClause)
	if err := tx.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to count endpoints")
		return
	}

	models.WriteJSON(w, http.StatusOK, map[string]int{"total_count": totalCount})
}

// ListEndpoints returns a page of endpoints. It does NOT compute the total count —
// the client fetches that separately via CountEndpoints and caches it across page changes.
func (h *Handler) ListEndpoints(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := map[string][]string(r.URL.Query())
	whereClause, args, hasConditions := buildEndpointFilters(q)

	// Sort
	qv := r.URL.Query()
	sortCol := sanitizeSortColumn(qv.Get("sort_by"))
	sortDir := "ASC"
	if strings.EqualFold(qv.Get("sort_dir"), "desc") {
		sortDir = "DESC"
	}
	orderClause := fmt.Sprintf("ORDER BY %s %s", sortCol, sortDir)

	tx, err := h.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		log.WithError(err).Error("beginning transaction")
		models.WriteError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	if hasConditions {
		if _, err := tx.ExecContext(ctx, "SET LOCAL enable_seqscan=off"); err != nil {
			log.WithError(err).Warn("could not set enable_seqscan=off")
		}
	}

	argIdx := len(args) + 1
	dataQuery := fmt.Sprintf(`SELECT url, endpoint_names, info_created, info_updated, list_source,
		vendor_name, capability_fhir_version, fhir_version, format,
		http_response, response_time_seconds, smart_http_response, errors,
		availability, kind, requested_fhir_version, is_chpl, status, cap_stat_exists
		FROM fhir_endpoint_comb_mv %s %s LIMIT $%d OFFSET $%d`,
		whereClause, orderClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := tx.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch endpoints")
		return
	}
	defer rows.Close()

	var endpoints []models.Endpoint
	for rows.Next() {
		var ep models.Endpoint
		if err := rows.Scan(
			&ep.URL, &ep.EndpointNames, &ep.InfoCreated, &ep.InfoUpdated,
			&ep.ListSource, &ep.VendorName, &ep.CapabilityFHIRVersion,
			&ep.FHIRVersion, &ep.Format, &ep.HTTPResponse,
			&ep.ResponseTimeSeconds, &ep.SMARTHTTPResponse, &ep.Errors,
			&ep.Availability, &ep.Kind, &ep.RequestedFHIRVersion,
			&ep.IsChpl, &ep.Status, &ep.CapStatExists,
		); err != nil {
			log.WithError(err).Error("scanning endpoint row")
			continue
		}
		endpoints = append(endpoints, ep)
	}
	if endpoints == nil {
		endpoints = []models.Endpoint{}
	}

	models.WriteJSON(w, http.StatusOK, endpoints)
}

// parseAvailabilityRange converts availability filter string to 0.0-1.0 range.
func parseAvailabilityRange(avail string) (float64, float64) {
	switch avail {
	case "0":
		return 0, 0
	case "0-50":
		return 0, 0.50
	case "50-100":
		return 0.50, 1.0
	case "75-100":
		return 0.75, 1.0
	case "95-100":
		return 0.95, 1.0
	case "99-100":
		return 0.99, 1.0
	case "100":
		return 1.0, 1.0
	default:
		if v, err := strconv.ParseFloat(avail, 64); err == nil {
			return v / 100.0, 1.0
		}
		return 0, 1.0
	}
}

// sanitizeSortColumn returns a safe column name for ORDER BY.
func sanitizeSortColumn(col string) string {
	allowed := map[string]string{
		"url":                    "url",
		"vendor_name":            "vendor_name",
		"fhir_version":          "fhir_version",
		"http_response":         "http_response",
		"availability":          "availability",
		"response_time_seconds": "response_time_seconds",
		"status":                "status",
		"endpoint_names":        "endpoint_names",
		"format":                "format",
		"cap_stat_exists":       "cap_stat_exists",
	}
	if safe, ok := allowed[col]; ok {
		return safe
	}
	return "vendor_name"
}

// pqStringArray converts a Go string slice to a PostgreSQL array literal for use with ANY().
func pqStringArray(ss []string) string {
	escaped := make([]string, len(ss))
	for i, s := range ss {
		escaped[i] = strings.ReplaceAll(s, "'", "''")
	}
	return "{" + strings.Join(escaped, ",") + "}"
}

// buildTsQuery converts user search input to a PostgreSQL tsquery string.
func buildTsQuery(input string) string {
	input = sanitizeSearchInput(input)
	words := strings.Fields(input)
	if len(words) == 0 {
		return ""
	}
	parts := make([]string, 0, len(words))
	for _, w := range words {
		if w != "" {
			parts = append(parts, w+":*")
		}
	}
	return strings.Join(parts, " & ")
}

// sanitizeSearchInput removes characters that could break tsquery parsing.
func sanitizeSearchInput(input string) string {
	replacer := strings.NewReplacer(
		"&", "", "|", "", "!", "", "(", "", ")", "",
		"'", "", ":", "", "*", "", "<", "", ">", "",
		"\\", "",
	)
	return replacer.Replace(input)
}
