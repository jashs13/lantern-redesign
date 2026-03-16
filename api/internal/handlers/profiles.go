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

// ProfilesStats returns aggregate statistics from mv_profile_stats.
func (h *Handler) ProfilesStats(w http.ResponseWriter, r *http.Request) {
	var stats models.ProfileStats
	err := h.db.QueryRowContext(r.Context(), `
		SELECT distinct_profiles, us_core_profiles, endpoints_with_profiles, avg_profiles_per_endpoint
		FROM mv_profile_stats`).Scan(
		&stats.DistinctProfiles,
		&stats.USCoreProfiles,
		&stats.EndpointsWithProfiles,
		&stats.AvgProfilesPerEndpoint,
	)
	if err != nil {
		log.Errorf("ProfilesStats: %v", err)
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch profile stats")
		return
	}
	models.WriteJSON(w, http.StatusOK, stats)
}

// ListProfileAdoption returns a paginated, profile-centric adoption table.
// Each row is a unique profileurl with its distinct endpoint count and adoption %.
//
// Fast path: when no aggregating filters (fhir_versions, vendor, resource) are active,
// query mv_profile_adoption directly (pre-computed aggregation).
// Slow path: aggregating filters active → dynamic GROUP BY on mv_profiles_paginated.
func (h *Handler) ListProfileAdoption(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	fv := q.Get("fhir_versions")
	vendor := q.Get("vendor")
	resource := q.Get("resource")
	search := q.Get("search")

	hasAggregatingFilters := fv != "" || vendor != "" || resource != ""

	if !hasAggregatingFilters {
		// Fast path: query pre-computed mv_profile_adoption.
		var args []any
		argIdx := 1
		whereClause := ""
		if search != "" {
			pattern := "%" + search + "%"
			whereClause = fmt.Sprintf(
				"WHERE profile_url ILIKE $%d OR profile_name ILIKE $%d", argIdx, argIdx)
			args = append(args, pattern)
			argIdx++
		}

		var totalCount int
		h.db.QueryRowContext(ctx,
			fmt.Sprintf("SELECT COUNT(*) FROM mv_profile_adoption %s", whereClause),
			args...).Scan(&totalCount)

		dataQuery := fmt.Sprintf(`
			SELECT profile_url, profile_name, endpoint_count, adoption_pct
			FROM mv_profile_adoption %s
			ORDER BY endpoint_count DESC
			LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
		args = append(args, pageSize, models.Offset(page, pageSize))

		rows, err := h.db.QueryContext(ctx, dataQuery, args...)
		if err != nil {
			log.WithError(err).Error("querying profile adoption from mv_profile_adoption")
			models.WriteError(w, http.StatusInternalServerError, "failed to fetch profile adoption")
			return
		}
		defer rows.Close()

		var items []models.ProfileAdoptionItem
		for rows.Next() {
			var item models.ProfileAdoptionItem
			if err := rows.Scan(&item.ProfileURL, &item.ProfileName,
				&item.EndpointCount, &item.AdoptionPct); err != nil {
				continue
			}
			items = append(items, item)
		}
		if items == nil {
			items = []models.ProfileAdoptionItem{}
		}
		models.WriteJSON(w, http.StatusOK, models.PaginatedResponse[models.ProfileAdoptionItem]{
			Data:       items,
			Pagination: models.NewPagination(page, pageSize, totalCount),
		})
		return
	}

	// Slow path: aggregating filters change which endpoints count per profile,
	// so we must compute dynamically from mv_profiles_paginated.
	var conditions []string
	var args []any
	argIdx := 1

	if fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}
	if vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}
	if resource != "" {
		conditions = append(conditions, fmt.Sprintf("resource = $%d", argIdx))
		args = append(args, resource)
		argIdx++
	}
	if search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(profileurl ILIKE $%d OR profilename ILIKE $%d)", argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	baseWhere := "WHERE profileurl IS NOT NULL AND " + strings.Join(conditions, " AND ")

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(DISTINCT profileurl) FROM mv_profiles_paginated %s", baseWhere),
		args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(`
		SELECT
			COALESCE(profileurl, '')       AS profile_url,
			COALESCE(MAX(profilename), '') AS profile_name,
			COUNT(DISTINCT url)            AS endpoint_count,
			ROUND(
				COUNT(DISTINCT url) * 100.0
				/ NULLIF((SELECT indexed_endpoints FROM mv_endpoint_totals), 0),
				1
			) AS adoption_pct
		FROM mv_profiles_paginated %s
		GROUP BY profileurl
		ORDER BY endpoint_count DESC
		LIMIT $%d OFFSET $%d`, baseWhere, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying profile adoption with filters")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch profile adoption")
		return
	}
	defer rows.Close()

	var items []models.ProfileAdoptionItem
	for rows.Next() {
		var item models.ProfileAdoptionItem
		if err := rows.Scan(&item.ProfileURL, &item.ProfileName,
			&item.EndpointCount, &item.AdoptionPct); err != nil {
			continue
		}
		items = append(items, item)
	}
	if items == nil {
		items = []models.ProfileAdoptionItem{}
	}
	models.WriteJSON(w, http.StatusOK, models.PaginatedResponse[models.ProfileAdoptionItem]{
		Data:       items,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	})
}

// ProfilesChart returns the top 15 profiles by distinct endpoint count.
// Uses mv_profile_adoption (pre-computed) for instant response.
func (h *Handler) ProfilesChart(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT
			COALESCE(NULLIF(profile_name, ''), profile_url) AS name,
			profile_url,
			endpoint_count
		FROM mv_profile_adoption
		ORDER BY endpoint_count DESC
		LIMIT 15`)
	if err != nil {
		log.Errorf("ProfilesChart: %v", err)
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch profiles chart data")
		return
	}
	defer rows.Close()

	var result []models.ProfileChartItem
	for rows.Next() {
		var item models.ProfileChartItem
		if err := rows.Scan(&item.Name, &item.ProfileURL, &item.EndpointCount); err != nil {
			continue
		}
		result = append(result, item)
	}
	if result == nil {
		result = []models.ProfileChartItem{}
	}
	models.WriteJSON(w, http.StatusOK, result)
}
