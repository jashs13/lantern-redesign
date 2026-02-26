package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListFields returns capability statement field data from mv_capstat_fields.
func (h *Handler) ListFields(w http.ResponseWriter, r *http.Request) {
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
		fmt.Sprintf(`SELECT field_name, fhir_version, count, is_required
		 FROM mv_capstat_fields %s
		 ORDER BY field_name, fhir_version`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying fields")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch fields")
		return
	}
	defer rows.Close()

	var fields []models.Field
	for rows.Next() {
		var f models.Field
		if err := rows.Scan(&f.FieldName, &f.FHIRVersion, &f.Count, &f.IsRequired); err != nil {
			continue
		}
		fields = append(fields, f)
	}
	if fields == nil {
		fields = []models.Field{}
	}
	models.WriteJSON(w, http.StatusOK, fields)
}

// FieldValues returns values for a specific field from mv_capstat_values.
func (h *Handler) FieldValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	field := q.Get("field")
	if field == "" {
		models.WriteError(w, http.StatusBadRequest, "field parameter is required")
		return
	}

	var conditions []string
	var args []any
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("field_name = $%d", argIdx))
	args = append(args, field)
	argIdx++

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

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count
	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM mv_capstat_values %s", whereClause),
		args...).Scan(&totalCount)

	// Data
	dataQuery := fmt.Sprintf(
		`SELECT field_name, field_value, fhir_version, endpoint_count
		 FROM mv_capstat_values %s
		 ORDER BY endpoint_count DESC
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying field values")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch field values")
		return
	}
	defer rows.Close()

	var values []models.FieldValue
	for rows.Next() {
		var fv models.FieldValue
		if err := rows.Scan(&fv.FieldName, &fv.FieldValue, &fv.FHIRVersion, &fv.EndpointCount); err != nil {
			continue
		}
		values = append(values, fv)
	}
	if values == nil {
		values = []models.FieldValue{}
	}

	resp := models.PaginatedResponse[models.FieldValue]{
		Data:       values,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}
