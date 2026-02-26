package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListSecurity returns paginated security endpoint data.
func (h *Handler) ListSecurity(w http.ResponseWriter, r *http.Request) {
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

	if authType := q.Get("auth_type"); authType != "" {
		conditions = append(conditions, fmt.Sprintf("security_code = $%d", argIdx))
		args = append(args, authType)
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(url ILIKE $%d OR vendor_name ILIKE $%d OR security_code ILIKE $%d)",
			argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM security_endpoints_distinct_mv %s", whereClause),
		args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(
		`SELECT url, vendor_name, fhir_version, security_code, security_system
		 FROM security_endpoints_distinct_mv %s
		 ORDER BY url
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying security endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch security data")
		return
	}
	defer rows.Close()

	var endpoints []models.SecurityEndpoint
	for rows.Next() {
		var ep models.SecurityEndpoint
		if err := rows.Scan(&ep.URL, &ep.VendorName, &ep.FHIRVersion,
			&ep.SecurityCode, &ep.SecuritySystem); err != nil {
			continue
		}
		endpoints = append(endpoints, ep)
	}
	if endpoints == nil {
		endpoints = []models.SecurityEndpoint{}
	}

	resp := models.PaginatedResponse[models.SecurityEndpoint]{
		Data:       endpoints,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// SecuritySummary returns security count summaries.
func (h *Handler) SecuritySummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var summary models.SecuritySummaryData

	// Security counts by FHIR version
	scRows, err := h.db.QueryContext(ctx,
		`SELECT fhir_version, COALESCE(has_security, 0), COALESCE(no_security, 0)
		 FROM mv_endpoint_security_counts
		 ORDER BY fhir_version`)
	if err != nil {
		log.WithError(err).Error("querying security counts")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch security summary")
		return
	}
	defer scRows.Close()

	for scRows.Next() {
		var sc models.SecurityCount
		if err := scRows.Scan(&sc.FHIRVersion, &sc.HasSecurity, &sc.NoSecurity); err != nil {
			continue
		}
		summary.SecurityCounts = append(summary.SecurityCounts, sc)
	}
	if summary.SecurityCounts == nil {
		summary.SecurityCounts = []models.SecurityCount{}
	}

	// Auth type counts
	atRows, err := h.db.QueryContext(ctx,
		`SELECT code, fhir_version, count
		 FROM mv_auth_type_count
		 ORDER BY fhir_version, code`)
	if err == nil {
		defer atRows.Close()
		for atRows.Next() {
			var at models.AuthTypeCount
			if err := atRows.Scan(&at.Code, &at.FHIRVersion, &at.Count); err != nil {
				continue
			}
			summary.AuthTypeCounts = append(summary.AuthTypeCounts, at)
		}
	}
	if summary.AuthTypeCounts == nil {
		summary.AuthTypeCounts = []models.AuthTypeCount{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}
