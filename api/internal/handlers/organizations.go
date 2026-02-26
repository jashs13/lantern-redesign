package handlers

import (
	"fmt"
	"net/http"
	"strings"

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

	// Count query
	countQuery := fmt.Sprintf(`
		WITH base_data AS (
			SELECT organization_name, identifier_types_html AS identifier_type,
				identifier_values_html AS identifier_value, addresses_html AS address,
				org_urls_html AS org_url, endpoint_urls_html AS url,
				fhir_versions_array, vendor_names_array
			FROM mv_organizations_final
			%s
		)
		SELECT COUNT(*) FROM (
			SELECT organization_name, identifier_type, identifier_value, address, org_url, url,
				string_agg(DISTINCT fhir_version, '<br/>') AS fhir_version,
				string_agg(DISTINCT vendor_name, '<br/>') AS vendor_name
			FROM base_data bd
			CROSS JOIN LATERAL unnest(bd.fhir_versions_array) AS fhir_version
			CROSS JOIN LATERAL unnest(bd.vendor_names_array) AS vendor_name
			GROUP BY organization_name, identifier_type, identifier_value, address, org_url, url
		) counted_results`, baseWhere)

	var totalCount int
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting organizations")
		models.WriteError(w, http.StatusInternalServerError, "failed to count organizations")
		return
	}

	// Data query
	dataQuery := fmt.Sprintf(`
		WITH base_data AS (
			SELECT organization_name, identifier_types_html AS identifier_type,
				identifier_values_html AS identifier_value, addresses_html AS address,
				org_urls_html AS org_url, endpoint_urls_html AS url,
				fhir_versions_array, vendor_names_array
			FROM mv_organizations_final
			%s
		)
		SELECT organization_name, identifier_type, identifier_value, address, org_url, url,
			string_agg(DISTINCT fhir_version, '<br/>') AS fhir_version,
			string_agg(DISTINCT vendor_name, '<br/>') AS vendor_name
		FROM base_data bd
		CROSS JOIN LATERAL unnest(bd.fhir_versions_array) AS fhir_version
		CROSS JOIN LATERAL unnest(bd.vendor_names_array) AS vendor_name
		GROUP BY organization_name, identifier_type, identifier_value, address, org_url, url
		ORDER BY (organization_name ~ '[A-Za-z]') DESC, organization_name ASC
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
