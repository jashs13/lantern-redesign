package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ValidationsSummary returns validation result summary for chart rendering.
func (h *Handler) ValidationsSummary(w http.ResponseWriter, r *http.Request) {
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

	if group := q.Get("validation_group"); group != "" {
		conditions = append(conditions, fmt.Sprintf("rule_name = $%d", argIdx))
		args = append(args, group)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT rule_name, COALESCE(valid, 0), COALESCE(invalid, 0), fhir_version
		 FROM mv_validation_results_plot %s
		 ORDER BY rule_name, fhir_version`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying validation summary")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch validation summary")
		return
	}
	defer rows.Close()

	var results []models.ValidationSummary
	for rows.Next() {
		var v models.ValidationSummary
		if err := rows.Scan(&v.RuleName, &v.Valid, &v.Invalid, &v.FHIRVersion); err != nil {
			continue
		}
		results = append(results, v)
	}
	if results == nil {
		results = []models.ValidationSummary{}
	}
	models.WriteJSON(w, http.StatusOK, results)
}

// ValidationsDetails returns validation rule details for the left table.
func (h *Handler) ValidationsDetails(w http.ResponseWriter, r *http.Request) {
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

	if group := q.Get("validation_group"); group != "" {
		conditions = append(conditions, fmt.Sprintf("rule_name = $%d", argIdx))
		args = append(args, group)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT rule_name, description, reference,
		        COALESCE(valid, 0), COALESCE(invalid, 0), fhir_version
		 FROM mv_validation_details %s
		 ORDER BY rule_name, fhir_version`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying validation details")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch validation details")
		return
	}
	defer rows.Close()

	var details []models.ValidationDetail
	for rows.Next() {
		var d models.ValidationDetail
		if err := rows.Scan(&d.RuleName, &d.Description, &d.Reference,
			&d.Valid, &d.Invalid, &d.FHIRVersion); err != nil {
			continue
		}
		details = append(details, d)
	}
	if details == nil {
		details = []models.ValidationDetail{}
	}
	models.WriteJSON(w, http.StatusOK, details)
}

// ValidationsFailures returns paginated failure details for a selected rule.
func (h *Handler) ValidationsFailures(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	ruleName := q.Get("rule_name")
	if ruleName == "" {
		models.WriteError(w, http.StatusBadRequest, "rule_name parameter is required")
		return
	}

	var conditions []string
	var args []any
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("v.rule_name = $%d", argIdx))
	args = append(args, ruleName)
	argIdx++

	conditions = append(conditions, "v.valid = false")

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fi.fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf(`SELECT COUNT(*)
		 FROM validations v
		 JOIN fhir_endpoints_info fi ON v.validation_result_id = fi.validation_result_id
		 %s`, whereClause), args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(`
		SELECT fi.url, vend.name AS vendor_name, v.expected, v.actual, v.comment, fi.fhir_version
		FROM validations v
		JOIN fhir_endpoints_info fi ON v.validation_result_id = fi.validation_result_id
		LEFT JOIN vendors vend ON fi.vendor_id = vend.id
		%s
		ORDER BY fi.url
		LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying validation failures")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch validation failures")
		return
	}
	defer rows.Close()

	var failures []models.ValidationFailure
	for rows.Next() {
		var f models.ValidationFailure
		if err := rows.Scan(&f.URL, &f.VendorName, &f.Expected, &f.Actual,
			&f.Comment, &f.FHIRVersion); err != nil {
			continue
		}
		failures = append(failures, f)
	}
	if failures == nil {
		failures = []models.ValidationFailure{}
	}

	resp := models.PaginatedResponse[models.ValidationFailure]{
		Data:       failures,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}
