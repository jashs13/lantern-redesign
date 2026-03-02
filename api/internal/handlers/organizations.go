package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListOrganizations returns a paginated list of organizations from mv_organizations_final.
// Uses the CTE + CROSS JOIN LATERAL unnest() pattern from the Shiny organizationsmodule.R.
func (h *Handler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	// Build WHERE conditions for base_data CTE
	var baseConditions []string
	var args []any
	argIdx := 1

	// FHIR version filter (array overlap)
	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		baseConditions = append(baseConditions, fmt.Sprintf("fhir_versions_array && ARRAY[%s]::text[]", makePlaceholderList(argIdx, len(versions))))
		for _, v := range versions {
			args = append(args, v)
		}
		argIdx += len(versions)
	}

	// Vendor filter (array overlap)
	if vendor := q.Get("vendor"); vendor != "" {
		baseConditions = append(baseConditions, fmt.Sprintf("vendor_names_array && ARRAY[$%d]::text[]", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	// State filter — match ", ST " or ", ST<br/>" patterns in addresses_html
	if state := strings.ToUpper(q.Get("state")); state != "" && utf8.RuneCountInString(state) == 2 {
		baseConditions = append(baseConditions, fmt.Sprintf("addresses_html ILIKE $%d", argIdx))
		args = append(args, "%, "+state+"%")
		argIdx++
	}

	// Text search
	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		baseConditions = append(baseConditions, fmt.Sprintf(
			`(organization_name ILIKE $%d
			  OR identifier_types_html ILIKE $%d
			  OR identifier_values_html ILIKE $%d
			  OR addresses_html ILIKE $%d
			  OR endpoint_urls_html ILIKE $%d
			  OR fhir_versions_html ILIKE $%d
			  OR vendor_names_html ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	baseWhere := "WHERE TRUE"
	if len(baseConditions) > 0 {
		baseWhere = "WHERE TRUE AND " + strings.Join(baseConditions, " AND ")
	}

	// Count query — count rows directly from base_data (one row per org in the view)
	// to avoid the expensive CROSS JOIN LATERAL unnest cartesian product.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM mv_organizations_final
		%s`, baseWhere)

	var totalCount int
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting organizations")
		models.WriteError(w, http.StatusInternalServerError, "failed to count organizations")
		return
	}

	// Data query — use pre-computed fhir_versions_html and vendor_names_html directly
	// to avoid the expensive CROSS JOIN LATERAL unnest cartesian product + GROUP BY.
	dataQuery := fmt.Sprintf(`
		SELECT organization_name, identifier_types_html AS identifier_type,
			identifier_values_html AS identifier_value, addresses_html AS address,
			org_urls_html AS org_url, endpoint_urls_html AS url,
			fhir_versions_html AS fhir_version,
			vendor_names_html AS vendor_name
		FROM mv_organizations_final
		%s
		ORDER BY organization_name ASC
		LIMIT $%d OFFSET $%d`, baseWhere, argIdx, argIdx+1)

	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying organizations")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch organizations")
		return
	}
	defer rows.Close()

	var orgs []models.Organization
	for rows.Next() {
		var org models.Organization
		if err := rows.Scan(
			&org.OrganizationName, &org.IdentifierType, &org.IdentifierValue,
			&org.Address, &org.OrgURL, &org.EndpointURL,
			&org.FHIRVersion, &org.VendorName,
		); err != nil {
			log.WithError(err).Error("scanning organization row")
			continue
		}
		orgs = append(orgs, org)
	}
	if orgs == nil {
		orgs = []models.Organization{}
	}

	resp := models.PaginatedResponse[models.Organization]{
		Data:       orgs,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// makePlaceholderList generates "$1,$2,$3" for the given starting index and count.
func makePlaceholderList(startIdx, count int) string {
	parts := make([]string, count)
	for i := 0; i < count; i++ {
		parts[i] = fmt.Sprintf("$%d", startIdx+i)
	}
	return strings.Join(parts, ",")
}
