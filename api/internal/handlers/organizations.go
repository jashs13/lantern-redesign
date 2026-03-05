package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// buildOrgFilters parses the request and returns a WHERE clause + args.
// Shared by ListOrganizations and CountOrganizations so the count endpoint
// can be cached independently of the page number in React Query.
func buildOrgFilters(q map[string][]string) (whereClause string, args []any, nextArgIdx int) {
	get := func(key string) string {
		if vals, ok := q[key]; ok && len(vals) > 0 {
			return vals[0]
		}
		return ""
	}

	var conditions []string
	argIdx := 1

	// FHIR version filter (array overlap)
	if fv := get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_versions_array && ARRAY[%s]::text[]", makePlaceholderList(argIdx, len(versions))))
		for _, v := range versions {
			args = append(args, v)
		}
		argIdx += len(versions)
	}

	// Vendor filter (array overlap)
	if vendor := get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_names_array && ARRAY[$%d]::text[]", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	// State filter — match ", ST " or ", ST<br/>" patterns in addresses_html
	if state := strings.ToUpper(get("state")); state != "" && utf8.RuneCountInString(state) == 2 {
		conditions = append(conditions, fmt.Sprintf("addresses_html ILIKE $%d", argIdx))
		args = append(args, "%, "+state+"%")
		argIdx++
	}

	// Text search
	if search := get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
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

	whereClause = "WHERE TRUE"
	if len(conditions) > 0 {
		whereClause = "WHERE TRUE AND " + strings.Join(conditions, " AND ")
	}
	return whereClause, args, argIdx
}

// CountOrganizations returns only the total row count for a given filter set.
// The frontend caches this independently of page number so pagination page changes
// don't re-run the 200ms count query.
func (h *Handler) CountOrganizations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	whereClause, args, _ := buildOrgFilters(map[string][]string(r.URL.Query()))

	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM mv_organizations_final %s", whereClause)
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting organizations")
		models.WriteError(w, http.StatusInternalServerError, "failed to count organizations")
		return
	}
	models.WriteJSON(w, http.StatusOK, map[string]int{"total_count": totalCount})
}

// ListOrganizations returns a page of organizations. It does NOT compute the total count —
// the client fetches that separately via CountOrganizations and caches it across page changes.
func (h *Handler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	whereClause, args, argIdx := buildOrgFilters(map[string][]string(r.URL.Query()))

	dataQuery := fmt.Sprintf(`
		SELECT organization_name, identifier_types_html AS identifier_type,
			identifier_values_html AS identifier_value, addresses_html AS address,
			org_urls_html AS org_url, endpoint_urls_html AS url,
			fhir_versions_html AS fhir_version,
			vendor_names_html AS vendor_name
		FROM mv_organizations_final
		%s
		ORDER BY organization_name ASC
		LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)

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

	models.WriteJSON(w, http.StatusOK, orgs)
}

// makePlaceholderList generates "$1,$2,$3" for the given starting index and count.
func makePlaceholderList(startIdx, count int) string {
	parts := make([]string, count)
	for i := 0; i < count; i++ {
		parts[i] = fmt.Sprintf("$%d", startIdx+i)
	}
	return strings.Join(parts, ",")
}
