package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListProfiles returns paginated profile data from mv_profiles_paginated.
func (h *Handler) ListProfiles(w http.ResponseWriter, r *http.Request) {
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

	if resource := q.Get("resource"); resource != "" {
		conditions = append(conditions, fmt.Sprintf("resource = $%d", argIdx))
		args = append(args, resource)
		argIdx++
	}

	if profile := q.Get("profile"); profile != "" {
		conditions = append(conditions, fmt.Sprintf("profileurl = $%d", argIdx))
		args = append(args, profile)
		argIdx++
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(url ILIKE $%d OR profileurl ILIKE $%d OR profilename ILIKE $%d OR resource ILIKE $%d OR vendor_name ILIKE $%d)",
			argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM mv_profiles_paginated %s", whereClause),
		args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(
		`SELECT url, profileurl, profilename, resource, vendor_name, fhir_version
		 FROM mv_profiles_paginated %s
		 ORDER BY profileurl, url
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying profiles")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch profiles")
		return
	}
	defer rows.Close()

	var profiles []models.Profile
	for rows.Next() {
		var p models.Profile
		if err := rows.Scan(&p.URL, &p.ProfileURL, &p.ProfileName, &p.Resource,
			&p.VendorName, &p.FHIRVersion); err != nil {
			continue
		}
		profiles = append(profiles, p)
	}
	if profiles == nil {
		profiles = []models.Profile{}
	}

	resp := models.PaginatedResponse[models.Profile]{
		Data:       profiles,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}
