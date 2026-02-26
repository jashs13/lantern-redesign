package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListResources returns paginated resource type data from mv_resource_interactions.
func (h *Handler) ListResources(w http.ResponseWriter, r *http.Request) {
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

	if resources := q.Get("resources"); resources != "" {
		rList := strings.Split(resources, ",")
		conditions = append(conditions, fmt.Sprintf("resource_type = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(rList))
		argIdx++
	}

	if ops := q.Get("operations"); ops != "" {
		opList := strings.Split(ops, ",")
		conditions = append(conditions, fmt.Sprintf("operations @> $%d::text[]", argIdx))
		args = append(args, pqStringArray(opList))
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf("(resource_type ILIKE $%d OR fhir_version ILIKE $%d)", argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count
	countQuery := fmt.Sprintf(
		`SELECT COUNT(*) FROM (
			SELECT resource_type, fhir_version, SUM(endpoint_count) AS n
			FROM mv_resource_interactions %s
			GROUP BY resource_type, fhir_version
		) sub`, whereClause)
	var totalCount int
	h.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)

	// Data
	dataQuery := fmt.Sprintf(
		`SELECT resource_type, fhir_version, SUM(endpoint_count) AS n
		 FROM mv_resource_interactions %s
		 GROUP BY resource_type, fhir_version
		 ORDER BY resource_type
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying resources")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch resources")
		return
	}
	defer rows.Close()

	var resources []models.Resource
	for rows.Next() {
		var res models.Resource
		if err := rows.Scan(&res.ResourceType, &res.FHIRVersion, &res.EndpointCount); err != nil {
			continue
		}
		resources = append(resources, res)
	}
	if resources == nil {
		resources = []models.Resource{}
	}

	resp := models.PaginatedResponse[models.Resource]{
		Data:       resources,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// ResourcesChart returns aggregated resource data for chart rendering.
func (h *Handler) ResourcesChart(w http.ResponseWriter, r *http.Request) {
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

	query := fmt.Sprintf(
		`SELECT resource_type, fhir_version, SUM(endpoint_count) AS n
		 FROM mv_resource_interactions %s
		 GROUP BY resource_type, fhir_version
		 ORDER BY resource_type`, whereClause)

	rows, err := h.db.QueryContext(ctx, query, args...)
	if err != nil {
		log.WithError(err).Error("querying resources chart")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch resources chart")
		return
	}
	defer rows.Close()

	var resources []models.Resource
	for rows.Next() {
		var res models.Resource
		if err := rows.Scan(&res.ResourceType, &res.FHIRVersion, &res.EndpointCount); err != nil {
			continue
		}
		resources = append(resources, res)
	}
	if resources == nil {
		resources = []models.Resource{}
	}
	models.WriteJSON(w, http.StatusOK, resources)
}
