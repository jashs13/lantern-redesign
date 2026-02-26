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

	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT ig_name, fhir_version, count
		 FROM mv_implementation_guide %s
		 ORDER BY count DESC, ig_name`, whereClause), args...)
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
	models.WriteJSON(w, http.StatusOK, guides)
}

// CapStatSizes returns capability statement size statistics.
func (h *Handler) CapStatSizes(w http.ResponseWriter, r *http.Request) {
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

	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT vendor_name, fhir_version, min_size, max_size, mean_size, std_dev, count
		 FROM mv_capstat_sizes_tbl %s
		 ORDER BY vendor_name, fhir_version`, whereClause), args...)
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
	models.WriteJSON(w, http.StatusOK, sizes)
}
