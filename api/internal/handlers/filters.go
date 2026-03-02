package handlers

import (
	"net/http"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// FilterVendors returns distinct vendor names.
func (h *Handler) FilterVendors(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT DISTINCT name FROM vendors WHERE name IS NOT NULL ORDER BY name`)
	if err != nil {
		log.WithError(err).Error("querying vendor filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch vendors")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			log.WithError(err).Error("scanning vendor row")
			continue
		}
		options = append(options, models.FilterOption{Value: name})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterFHIRVersions returns distinct FHIR versions from the endpoint export.
func (h *Handler) FilterFHIRVersions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT DISTINCT fhir_version FROM endpoint_export_mv
		 WHERE fhir_version IS NOT NULL
		 ORDER BY fhir_version`)
	if err != nil {
		log.WithError(err).Error("querying FHIR version filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch FHIR versions")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			log.WithError(err).Error("scanning FHIR version row")
			continue
		}
		options = append(options, models.FilterOption{Value: version})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterResources returns distinct resource types.
func (h *Handler) FilterResources(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT DISTINCT resource_type FROM mv_endpoint_resource_types
		 WHERE resource_type IS NOT NULL
		 ORDER BY resource_type`)
	if err != nil {
		log.WithError(err).Error("querying resource filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch resources")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var rt string
		if err := rows.Scan(&rt); err != nil {
			continue
		}
		options = append(options, models.FilterOption{Value: rt})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterAuthTypes returns distinct authorization type codes.
func (h *Handler) FilterAuthTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT DISTINCT code FROM mv_auth_type_count WHERE code IS NOT NULL ORDER BY code`)
	if err != nil {
		log.WithError(err).Error("querying auth type filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch auth types")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			continue
		}
		options = append(options, models.FilterOption{Value: code})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterProfiles returns distinct profile URLs.
func (h *Handler) FilterProfiles(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT DISTINCT profileurl FROM endpoint_supported_profiles_mv
		 WHERE profileurl IS NOT NULL
		 ORDER BY profileurl`)
	if err != nil {
		log.WithError(err).Error("querying profiles filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch profiles")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			continue
		}
		options = append(options, models.FilterOption{Value: p})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterStates returns distinct 2-letter US state codes extracted from organization addresses.
func (h *Handler) FilterStates(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT DISTINCT (regexp_matches(addresses_html, '(?:,\s*)([A-Z]{2})(?:\s+\d{5})', 'g'))[1] AS state
		FROM mv_organizations_final
		ORDER BY state`)
	if err != nil {
		log.WithError(err).Error("querying states filter")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch states")
		return
	}
	defer rows.Close()

	var options []models.FilterOption
	for rows.Next() {
		var state string
		if err := rows.Scan(&state); err != nil {
			log.WithError(err).Error("scanning state row")
			continue
		}
		options = append(options, models.FilterOption{Value: state})
	}
	if options == nil {
		options = []models.FilterOption{}
	}
	models.WriteJSON(w, http.StatusOK, options)
}

// FilterValidationGroups returns static validation group names.
func (h *Handler) FilterValidationGroups(w http.ResponseWriter, r *http.Request) {
	// Validation groups are static configuration, not from the database.
	groups := []models.FilterOption{
		{Value: "Base Resource Fields"},
		{Value: "Conformance/Terminology"},
		{Value: "Security"},
		{Value: "Search"},
		{Value: "Miscellaneous"},
	}
	models.WriteJSON(w, http.StatusOK, groups)
}
