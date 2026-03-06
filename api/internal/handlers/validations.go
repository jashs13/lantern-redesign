package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

var validationGroupMap = map[string][]string{
	"HTTP": {
		"http://hl7.org/fhir/http.html",
	},
	"R4 Capability Statement": {
		"http://hl7.org/fhir/capabilitystatement.html",
	},
	"SMART": {
		"http://www.hl7.org/fhir/smart-app-launch/conformance/index.html",
	},
	"US-CORE": {
		"https://www.hl7.org/fhir/us/core/CapabilityStatement-us-core-server.html",
		"https://www.hl7.org/fhir/us/core/security.html",
	},
	"DSTU2 Conformance Statement": {
		"http://hl7.org/fhir/DSTU2/conformance.html",
	},
	"STU3 Capability Statement": {
		"http://hl7.org/fhir/STU3/capabilitystatement.html",
	},
	"$versions Operation": {
		"https://www.hl7.org/fhir/capabilitystatement-operation-versions.html",
	},
	"Other": {
		"",
	},
}

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
		if refs, ok := validationGroupMap[group]; ok {
			conditions = append(conditions, fmt.Sprintf("reference = ANY($%d::text[])", argIdx))
			args = append(args, pqStringArray(refs))
			argIdx++
		}
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
		fmt.Sprintf(`SELECT rule_name, 
		        SUM(CASE WHEN valid = true THEN 1 ELSE 0 END) as valid_count,
		        SUM(CASE WHEN valid = false THEN 1 ELSE 0 END) as invalid_count
		 FROM mv_validation_results_plot %s
		 GROUP BY rule_name
		 ORDER BY rule_name`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying validation summary")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch validation summary")
		return
	}
	defer rows.Close()

	var results []models.ValidationSummary
	for rows.Next() {
		var v models.ValidationSummary
		if err := rows.Scan(&v.RuleName, &v.Valid, &v.Invalid); err != nil {
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
		if refs, ok := validationGroupMap[group]; ok {
			conditions = append(conditions, fmt.Sprintf("p.reference = ANY($%d::text[])", argIdx))
			args = append(args, pqStringArray(refs))
			argIdx++
		}
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("p.vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	rows, err := h.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT DISTINCT p.rule_name, COALESCE(d.fhir_version_names, '') as fhir_version
		 FROM mv_validation_results_plot p
		 LEFT JOIN mv_validation_details d ON p.rule_name = d.rule_name
		 %s
		 ORDER BY p.rule_name`, whereClause), args...)
	if err != nil {
		log.WithError(err).Error("querying validation details")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch validation details")
		return
	}
	defer rows.Close()

	var details []models.ValidationDetail
	for rows.Next() {
		var d models.ValidationDetail
		if err := rows.Scan(&d.RuleName, &d.FHIRVersion); err != nil {
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

	conditions = append(conditions, fmt.Sprintf("rule_name = $%d", argIdx))
	args = append(args, ruleName)
	argIdx++

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if group := q.Get("validation_group"); group != "" {
		if refs, ok := validationGroupMap[group]; ok {
			conditions = append(conditions, fmt.Sprintf("reference = ANY($%d::text[])", argIdx))
			args = append(args, pqStringArray(refs))
			argIdx++
		}
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf(`SELECT COUNT(*)
		 FROM mv_validation_failures
		 %s`, whereClause), args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(`
		SELECT url, vendor_name, expected, actual, fhir_version
		FROM mv_validation_failures
		%s
		ORDER BY url
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
			&f.FHIRVersion); err != nil {
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
