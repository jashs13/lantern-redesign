package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ImplementationGuides returns implementation guide data aggregated across endpoints.
func (h *Handler) ImplementationGuides(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()
	page, pageSize := models.ParsePagination(r)

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

	// Count distinct (implementation_guide, fhir_version) pairs
	var totalCount int
	countSQL := fmt.Sprintf(`
		SELECT COUNT(*) FROM (
			SELECT implementation_guide, fhir_version
			FROM mv_implementation_guide %s
			GROUP BY implementation_guide, fhir_version
		) sub`, whereClause)
	if err := h.db.QueryRowContext(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting implementation guides")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch implementation guides")
		return
	}

	// Paginated data query with correct column name and aggregation
	args = append(args, pageSize, models.Offset(page, pageSize))
	dataSQL := fmt.Sprintf(`
		SELECT implementation_guide, fhir_version, COUNT(DISTINCT url) AS count
		FROM mv_implementation_guide %s
		GROUP BY implementation_guide, fhir_version
		ORDER BY count DESC, implementation_guide
		LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)

	rows, err := h.db.QueryContext(ctx, dataSQL, args...)
	if err != nil {
		log.WithError(err).Error("querying implementation guides")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch implementation guides")
		return
	}
	defer rows.Close()

	var guides []models.ImplementationGuide
	for rows.Next() {
		var ig models.ImplementationGuide
		if err := rows.Scan(&ig.Name, &ig.FHIRVersion, &ig.Count); err != nil {
			continue
		}
		guides = append(guides, ig)
	}
	if guides == nil {
		guides = []models.ImplementationGuide{}
	}

	resp := models.PaginatedResponse[models.ImplementationGuide]{
		Data:       guides,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// CapStatSizes returns capability statement size statistics.
func (h *Handler) CapStatSizes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()
	page, pageSize := models.ParsePagination(r)

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

	// Count distinct (vendor_name, fhir_version) groups
	var totalCount int
	countSQL := fmt.Sprintf(`
		SELECT COUNT(*) FROM (
			SELECT vendor_name, fhir_version
			FROM mv_capstat_sizes_tbl %s
			GROUP BY vendor_name, fhir_version
		) sub`, whereClause)
	if err := h.db.QueryRowContext(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting capstat sizes")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch capstat sizes")
		return
	}

	args = append(args, pageSize, models.Offset(page, pageSize))
	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT vendor_name, fhir_version,
		 MIN(size)::float8    AS min_size,
		 MAX(size)::float8    AS max_size,
		 AVG(size)::float8    AS mean_size,
		 STDDEV(size)::float8 AS std_dev,
		 COUNT(DISTINCT url)  AS count
		 FROM mv_capstat_sizes_tbl %s
		 GROUP BY vendor_name, fhir_version
		 ORDER BY vendor_name, fhir_version
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1), args...)
	if err != nil {
		log.WithError(err).Error("querying capstat sizes")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch capstat sizes")
		return
	}
	defer rows.Close()

	var sizes []models.CapStatSize
	for rows.Next() {
		var s models.CapStatSize
		if err := rows.Scan(&s.VendorName, &s.FHIRVersion, &s.Min, &s.Max,
			&s.Mean, &s.StdDev, &s.Count); err != nil {
			continue
		}
		sizes = append(sizes, s)
	}
	if sizes == nil {
		sizes = []models.CapStatSize{}
	}

	resp := models.PaginatedResponse[models.CapStatSize]{
		Data:       sizes,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}
