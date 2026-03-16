package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// fhirResourceCategories maps FHIR resource type names to their standard category.
// Resource types not in this map are categorized as "Other".
var fhirResourceCategories = map[string]string{
	// Clinical
	"AllergyIntolerance":       "Clinical",
	"CarePlan":                 "Clinical",
	"CareTeam":                 "Clinical",
	"Condition":                "Clinical",
	"DiagnosticReport":         "Clinical",
	"DocumentReference":        "Clinical",
	"Encounter":                "Clinical",
	"Goal":                     "Clinical",
	"Immunization":             "Clinical",
	"MedicationAdministration": "Clinical",
	"MedicationRequest":        "Clinical",
	"Observation":              "Clinical",
	"Procedure":                "Clinical",
	"Provenance":               "Clinical",
	// Financial
	"Claim":                      "Financial",
	"ClaimResponse":              "Financial",
	"Coverage":                   "Financial",
	"CoverageEligibilityRequest": "Financial",
	"ExplanationOfBenefit":       "Financial",
	// Administrative
	"Device":           "Administrative",
	"Location":         "Administrative",
	"Organization":     "Administrative",
	"Patient":          "Administrative",
	"Practitioner":     "Administrative",
	"PractitionerRole": "Administrative",
	"RelatedPerson":    "Administrative",
	"Schedule":         "Administrative",
	"Slot":             "Administrative",
	// Foundation
	"CapabilityStatement": "Foundation",
	"CodeSystem":          "Foundation",
	"ConceptMap":          "Foundation",
	"OperationDefinition": "Foundation",
	"SearchParameter":     "Foundation",
	"StructureDefinition": "Foundation",
	"ValueSet":            "Foundation",
}

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

	// Count — one row per resource_type regardless of version
	countQuery := fmt.Sprintf(
		`SELECT COUNT(*) FROM (
			SELECT resource_type
			FROM mv_resource_interactions %s
			GROUP BY resource_type
		) sub`, whereClause)
	var totalCount int
	h.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)

	// Data — group by resource_type only; aggregate versions with string_agg
	dataQuery := fmt.Sprintf(
		`SELECT
			ri.resource_type,
			string_agg(DISTINCT ri.fhir_version, ',' ORDER BY ri.fhir_version) AS fhir_versions,
			SUM(ri.endpoint_count)    AS endpoint_count,
			SUM(ri.read_search_count) AS read_search_count,
			ROUND(SUM(ri.endpoint_count)    * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS support_percent,
			ROUND(SUM(ri.read_search_count) * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS read_search_percent
		 FROM mv_resource_interactions ri, mv_endpoint_totals t
		 %s
		 GROUP BY ri.resource_type, t.indexed_endpoints
		 ORDER BY ri.resource_type
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
		var versionsStr string
		if err := rows.Scan(
			&res.ResourceType,
			&versionsStr,
			&res.EndpointCount,
			&res.ReadSearchCount,
			&res.SupportPercent,
			&res.ReadSearchPercent,
		); err != nil {
			continue
		}
		res.FHIRVersions = strings.Split(versionsStr, ",")
		if cat, ok := fhirResourceCategories[res.ResourceType]; ok {
			res.Category = cat
		} else {
			res.Category = "Other"
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

// GetResourceStats returns precomputed summary statistics from mv_resource_stats.
func (h *Handler) GetResourceStats(w http.ResponseWriter, r *http.Request) {
	var s models.ResourceStats
	err := h.db.QueryRowContext(r.Context(), `
		SELECT distinct_resources, avg_per_endpoint,
		       most_supported_resource, most_supported_percent,
		       uscdi_coverage_percent
		FROM mv_resource_stats`).Scan(
		&s.DistinctResources, &s.AvgPerEndpoint,
		&s.MostSupportedResource, &s.MostSupportedPercent,
		&s.USCDICoveragePercent,
	)
	if err != nil {
		log.Errorf("GetResourceStats: %v", err)
		http.Error(w, "failed to fetch resource stats", http.StatusInternalServerError)
		return
	}
	models.WriteJSON(w, http.StatusOK, s)
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
		`SELECT
			ri.resource_type,
			SUM(ri.endpoint_count)    AS endpoint_count,
			SUM(ri.read_search_count) AS read_search_count,
			ROUND(SUM(ri.endpoint_count)    * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS support_percent,
			ROUND(SUM(ri.read_search_count) * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS read_search_percent
		 FROM mv_resource_interactions ri, mv_endpoint_totals t
		 %s
		 GROUP BY ri.resource_type, t.indexed_endpoints
		 ORDER BY SUM(ri.endpoint_count) DESC`, whereClause)

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
		if err := rows.Scan(
			&res.ResourceType,
			&res.EndpointCount,
			&res.ReadSearchCount,
			&res.SupportPercent,
			&res.ReadSearchPercent,
		); err != nil {
			continue
		}
		if cat, ok := fhirResourceCategories[res.ResourceType]; ok {
			res.Category = cat
		} else {
			res.Category = "Other"
		}
		resources = append(resources, res)
	}
	if resources == nil {
		resources = []models.Resource{}
	}
	models.WriteJSON(w, http.StatusOK, resources)
}

// ResourceMatrix returns all rows from mv_resource_operation_support for the matrix view.
func (h *Handler) ResourceMatrix(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT resource_type, operation, endpoint_count, support_percent
		FROM mv_resource_operation_support
		ORDER BY resource_type, operation`)
	if err != nil {
		log.Errorf("ResourceMatrix: %v", err)
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch matrix data")
		return
	}
	defer rows.Close()

	var result []models.ResourceOperationSupport
	for rows.Next() {
		var row models.ResourceOperationSupport
		if err := rows.Scan(&row.ResourceType, &row.Operation, &row.EndpointCount, &row.SupportPercent); err != nil {
			continue
		}
		result = append(result, row)
	}
	if result == nil {
		result = []models.ResourceOperationSupport{}
	}
	models.WriteJSON(w, http.StatusOK, result)
}
