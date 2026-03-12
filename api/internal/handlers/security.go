package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListSecurity returns paginated security endpoint data.
func (h *Handler) ListSecurity(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("capability_fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	if authType := q.Get("auth_type"); authType != "" {
		conditions = append(conditions, fmt.Sprintf("code = $%d", argIdx))
		args = append(args, authType)
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(url ILIKE $%d OR vendor_name ILIKE $%d OR code ILIKE $%d)",
			argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	tx, err := h.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		log.WithError(err).Error("beginning security transaction")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch security data")
		return
	}
	defer tx.Rollback()

	// Disable seq scans only for non-search filters (fhir_version, vendor, auth_type use B-tree/composite indexes).
	// Search uses trigram GIN indexes which work correctly without this hint — forcing it with ILIKE
	// OR conditions causes the planner to pick poor plans and can trigger statement timeouts.
	hasNonSearchFilters := q.Get("fhir_versions") != "" || q.Get("vendor") != "" || q.Get("auth_type") != ""
	if hasNonSearchFilters {
		if _, err := tx.ExecContext(ctx, "SET LOCAL enable_seqscan=off"); err != nil {
			log.WithError(err).Warn("could not set enable_seqscan=off")
		}
	}

	var totalCount int
	if err := tx.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM security_endpoints_react_mv %s", whereClause),
		args...).Scan(&totalCount); err != nil {
		log.WithError(err).Error("counting security endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to count security data")
		return
	}

	dataQuery := fmt.Sprintf(
		`SELECT url, org_names, has_more_orgs, vendor_name, capability_fhir_version, tls_version, code
		 FROM security_endpoints_react_mv %s
		 ORDER BY url, id
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := tx.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying security endpoints")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch security data")
		return
	}
	defer rows.Close()

	var endpoints []models.SecurityEndpoint
	for rows.Next() {
		var ep models.SecurityEndpoint
		var orgNames sql.NullString
		var hasMoreOrgs sql.NullBool
		if err := rows.Scan(&ep.URL, &orgNames, &hasMoreOrgs, &ep.VendorName,
			&ep.FHIRVersion, &ep.TLSVersion, &ep.SecurityCode); err != nil {
			continue
		}
		if orgNames.Valid {
			ep.OrgNames = &orgNames.String
		}
		ep.HasMoreOrgs = hasMoreOrgs.Valid && hasMoreOrgs.Bool
		endpoints = append(endpoints, ep)
	}
	if endpoints == nil {
		endpoints = []models.SecurityEndpoint{}
	}

	resp := models.PaginatedResponse[models.SecurityEndpoint]{
		Data:       endpoints,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}

// GetSecurityOrgs returns all organization names for a given endpoint URL.
func (h *Handler) GetSecurityOrgs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	url := r.URL.Query().Get("url")
	if url == "" {
		models.WriteError(w, http.StatusBadRequest, "url parameter required")
		return
	}

	rows, err := h.db.QueryContext(ctx,
		`SELECT DISTINCT organization_name
		 FROM mv_endpoint_list_organizations
		 WHERE url = $1
		 ORDER BY organization_name`, url)
	if err != nil {
		log.WithError(err).Error("querying security orgs")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch orgs")
		return
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		names = append(names, name)
	}
	if names == nil {
		names = []string{}
	}
	models.WriteJSON(w, http.StatusOK, names)
}

// SecuritySummary returns security count summaries.
func (h *Handler) SecuritySummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var summary models.SecuritySummaryData

	// Security counts — actual columns: "Status" (text), "Endpoints" (int)
	scRows, err := h.db.QueryContext(ctx,
		`SELECT "Status", "Endpoints"
		 FROM mv_endpoint_security_counts
		 ORDER BY "Status"`)
	if err != nil {
		log.WithError(err).Error("querying security counts")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch security summary")
		return
	}
	defer scRows.Close()

	for scRows.Next() {
		var sc models.SecurityCount
		if err := scRows.Scan(&sc.Status, &sc.Endpoints); err != nil {
			continue
		}
		summary.SecurityCounts = append(summary.SecurityCounts, sc)
	}
	if summary.SecurityCounts == nil {
		summary.SecurityCounts = []models.SecurityCount{}
	}

	// Auth type counts — actual columns: "Code", "FHIR Version", "Endpoints"
	atRows, err := h.db.QueryContext(ctx,
		`SELECT "Code", "FHIR Version", "Endpoints"
		 FROM mv_auth_type_count
		 ORDER BY "FHIR Version", "Code"`)
	if err == nil {
		defer atRows.Close()
		for atRows.Next() {
			var at models.AuthTypeCount
			if err := atRows.Scan(&at.Code, &at.FHIRVersion, &at.Count); err != nil {
				continue
			}
			summary.AuthTypeCounts = append(summary.AuthTypeCounts, at)
		}
	}
	if summary.AuthTypeCounts == nil {
		summary.AuthTypeCounts = []models.AuthTypeCount{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}
