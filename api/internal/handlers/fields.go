package handlers

import (
	"database/sql"
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

	if search := q.Get("search"); search != "" {
		conditions = append(conditions, fmt.Sprintf("field ILIKE $%d", argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	isExtension := "false"
	if q.Get("is_extension") == "true" {
		isExtension = "true"
	}

	whereClause := fmt.Sprintf("WHERE extension = '%s' AND exist = 'true'", isExtension)
	if len(conditions) > 0 {
		whereClause += " AND " + strings.Join(conditions, " AND ")
	}

	dataQuery := fmt.Sprintf(`SELECT field as field_name, fhir_version, COUNT(DISTINCT endpoint_id) as count, 
		 field IN ('status', 'kind', 'fhirVersion', 'format', 'date') as is_required
		 FROM mv_capstat_fields 
		 %s
		 GROUP BY field, fhir_version
		 ORDER BY is_required DESC, field, fhir_version`, whereClause)

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
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

	conditions = append(conditions, fmt.Sprintf("field = $%d", argIdx))
	args = append(args, field)
	argIdx++

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("\"FHIR Version\" = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("\"Developer\" = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		conditions = append(conditions, fmt.Sprintf("field_value ILIKE $%d", argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	conditions = append(conditions, "is_used = 'yes'")
	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count
	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM selected_fhir_endpoints_values_mv %s", whereClause),
		args...).Scan(&totalCount)

	// Data
	dataQuery := fmt.Sprintf(
		`SELECT field as field_name, field_value, "FHIR Version" as fhir_version, "Endpoints" as endpoint_count
		 FROM selected_fhir_endpoints_values_mv %s
		 ORDER BY "Endpoints" DESC
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

// FieldValueSummary returns usage counts for a field from capstat_usage_summary_mv.
func (h *Handler) FieldValueSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	field := q.Get("field")
	if field == "" {
		models.WriteError(w, http.StatusBadRequest, "field parameter is required")
		return
	}

	var conditions []string
	var args []any
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("field = $%d", argIdx))
	args = append(args, field)
	argIdx++

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("\"FHIR Version\" = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("\"Developer\" = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	dataQuery := fmt.Sprintf(
		`SELECT is_used, COALESCE(SUM(count), 0) AS count
		 FROM capstat_usage_summary_mv %s
		 GROUP BY is_used`, whereClause)

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying field value summary")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch field value summary")
		return
	}
	defer rows.Close()

	var summary []models.FieldValueSummary
	for rows.Next() {
		var s models.FieldValueSummary
		if err := rows.Scan(&s.IsUsed, &s.Count); err != nil {
			continue
		}
		summary = append(summary, s)
	}
	if summary == nil {
		summary = []models.FieldValueSummary{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}

// FieldMetrics returns static aggregate KPI counts for capability statement fields.
func (h *Handler) FieldMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var metrics models.FieldMetrics

	query := `SELECT average_per_cap_stat, extension_count, optional_count 
	          FROM capstat_kpi_metrics_mv LIMIT 1`
	
	err := h.db.QueryRowContext(ctx, query).Scan(
		&metrics.AveragePerCapStat,
		&metrics.ExtensionCount,
		&metrics.OptionalCount,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// If view is empty or unpopulated, leave them as nil pointers.
			// The frontend will receive JSON nulls and can display "N/A"
		} else {
			log.WithError(err).Error("querying capstat_kpi_metrics_mv")
			models.WriteError(w, http.StatusInternalServerError, "failed to fetch field metrics")
			return
		}
	}

	// Required fields are currently statically tracked in the codebase as 5 fields.
	metrics.RequiredCount = 5

	models.WriteJSON(w, http.StatusOK, metrics)
}

// FieldValueMetrics returns static aggregate KPI counts for capability statement field values.
func (h *Handler) FieldValueMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var metrics models.FieldValueMetrics

	query := `SELECT fields_with_values, total_unique_values, most_uniform_field, most_uniform_score, most_varied_field, most_varied_score 
	          FROM field_values_kpi_metrics_mv LIMIT 1`
	
	err := h.db.QueryRowContext(ctx, query).Scan(
		&metrics.FieldsWithValues,
		&metrics.TotalUniqueValues,
		&metrics.MostUniformField,
		&metrics.MostUniformScore,
		&metrics.MostVariedField,
		&metrics.MostVariedScore,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// If view is empty or unpopulated, leave them as nil pointers.
			// The frontend will receive JSON nulls and can display "N/A"
		} else {
			log.WithError(err).Error("querying field_values_kpi_metrics_mv")
			models.WriteError(w, http.StatusInternalServerError, "failed to fetch field value metrics")
			return
		}
	}

	models.WriteJSON(w, http.StatusOK, metrics)
}
