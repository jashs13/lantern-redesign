package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// DownloadEndpointsCSV streams endpoint data as a CSV file.
// Accepts optional query params: fhir_versions, developer, source, availability, search.
func (h *Handler) DownloadEndpointsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	// Map REST API 'developer' param to internal 'vendor' param for shared filter logic
	if dev := q.Get("developer"); dev != "" {
		q.Set("vendor", dev)
	}

	whereClause, args, _ := buildEndpointFilters(q)

	query := fmt.Sprintf(`
		SELECT url, endpoint_names, info_created, info_updated, list_source, 
			vendor_name, capability_fhir_version, format, 
			http_response, response_time_seconds, smart_http_response, errors, 
			kind, requested_fhir_version, is_chpl, cap_stat_exists
		FROM fhir_endpoint_comb_mv 
		%s
		ORDER BY vendor_name, list_source, url, requested_fhir_version
	`, whereClause)
	rows, err := h.db.QueryContext(ctx, query, args...)
	if err != nil {
		log.WithError(err).Error("querying endpoint export")
		models.WriteError(w, http.StatusInternalServerError, "failed to export endpoints")
		return
	}
	defer rows.Close()

	filename := fmt.Sprintf("fhir_endpoints_%s.csv", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write legacy headers
	writer.Write([]string{
		"url", "api_information_source_name", "created_at", "updated", "list_source",
		"api_developer_name", "capability_fhir_version", "format",
		"http_response", "http_response_time_second", "smart_http_response", "errors",
		"kind", "requested_fhir_version", "source", "cap_stat_exists",
	})

	for rows.Next() {
		var url string
		var endpointNames, listSource, vendorName, capFhirVersion, format, httpResponse, smartHttpResponse, errors, kind, reqFhirVersion, isChpl, capStatExists *string
		var infoCreated, infoUpdated *time.Time
		var responseTime *float64

		if err := rows.Scan(
			&url, &endpointNames, &infoCreated, &infoUpdated, &listSource,
			&vendorName, &capFhirVersion, &format,
			&httpResponse, &responseTime, &smartHttpResponse, &errors,
			&kind, &reqFhirVersion, &isChpl, &capStatExists,
		); err != nil {
			log.WithError(err).Error("scanning export row")
			continue
		}

		// R formatting logic: endpoint_names subset > 100
		enStr := derefStr(endpointNames)
		parts := strings.Split(enStr, ";")
		if len(parts) > 100 {
			enStr = "Subset of Organizations, see Lantern Website for full list:" + strings.Join(parts[:100], ";")
		}

		// List source overrides
		lsStr := derefStr(listSource)
		vStr := derefStr(vendorName)
		switch vStr {
		case "1up (Gainwell)", "Acentra", "CNSI Provider One", "Conduent", "Edifecs", "Not Available", "Safhir from Onyx", "Salesforce/MiHIN", "State Developed":
			lsStr = "State Medicaid Agency (SMA) Provider Directory"
		}

		// Format dates (%m/%d/%y %H:%M) => "01/02/06 15:04" in Go layout
		cTime := ""
		if infoCreated != nil {
			cTime = infoCreated.Format("01/02/06 15:04")
		}
		uTime := ""
		if infoUpdated != nil {
			uTime = infoUpdated.Format("01/02/06 15:04")
		}

		rtStr := ""
		if responseTime != nil {
			rtStr = fmt.Sprintf("%v", *responseTime)
		}

		writer.Write([]string{
			url, enStr, cTime, uTime, lsStr,
			vStr, derefStr(capFhirVersion), derefStr(format),
			derefStr(httpResponse), rtStr, derefStr(smartHttpResponse), derefStr(errors),
			derefStr(kind), derefStr(reqFhirVersion), derefStr(isChpl), derefStr(capStatExists),
		})
	}
}

// DownloadOrganizationsCSV streams organization data as a CSV file.
func (h *Handler) DownloadOrganizationsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	if dev := q.Get("developer"); dev != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_names_array && ARRAY[$%d]::text[]", argIdx))
		args = append(args, dev)
		argIdx++
	}

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_versions_array && ARRAY[%s]::text[]", makePlaceholderList(argIdx, len(versions))))
		for _, v := range versions {
			args = append(args, v)
		}
		argIdx += len(versions)
	}

	if idVal := q.Get("identifier"); idVal != "" {
		conditions = append(conditions, fmt.Sprintf("$%d = ANY(string_to_array(identifier_values_csv, E'\\n'))", argIdx))
		args = append(args, idVal)
		argIdx++
	}

	if orgDetail := q.Get("organization_detail"); orgDetail == "present" {
		conditions = append(conditions, "((identifier_values_csv IS NOT NULL AND identifier_values_csv <> '') OR (addresses_csv IS NOT NULL AND addresses_csv <> ''))")
	}

	// State filter — match ", ST " or ", ST<br/>" patterns in addresses_html
	if stateVal := strings.ToUpper(q.Get("state")); stateVal != "" && len(stateVal) == 2 {
		conditions = append(conditions, fmt.Sprintf("addresses_html ILIKE $%d", argIdx))
		args = append(args, "%, "+stateVal+"%")
		argIdx++
	}

	// Text search
	if search := q.Get("search"); search != "" {
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
	whereClause := "WHERE 1=1"
	if len(conditions) > 0 {
		whereClause += " AND " + strings.Join(conditions, " AND ")
	}

	// Lateral unnest filtering
	filterLateral := ""
	if dev := q.Get("developer"); dev != "" {
		filterLateral += fmt.Sprintf(" AND vendor_name = $%d", argIdx)
		args = append(args, dev)
		argIdx++
	}
	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		filterLateral += fmt.Sprintf(" AND fhir_version IN (%s)", makePlaceholderList(argIdx, len(versions)))
		for _, v := range versions {
			args = append(args, v)
		}
		argIdx += len(versions)
	}

	query := fmt.Sprintf(`
		WITH base_data AS (
			SELECT
				organization_name,
				identifier_types_csv as identifier_type,
				identifier_values_csv as identifier_value,
				addresses_csv as address,
				endpoint_urls_csv as url,
				fhir_versions_array,
				vendor_names_array
			FROM mv_organizations_final
			%s
		)
		SELECT
			organization_name,
			identifier_type,
			identifier_value,
			address,
			url AS fhir_endpoint_url,
			string_agg(DISTINCT fhir_version, E'\n') AS fhir_version,
			string_agg(DISTINCT vendor_name, E'\n') AS api_developer_name
		FROM base_data bd
		CROSS JOIN LATERAL unnest(bd.fhir_versions_array) AS fhir_version
		CROSS JOIN LATERAL unnest(bd.vendor_names_array) AS vendor_name
		WHERE 1=1 %s
		GROUP BY organization_name, identifier_type, identifier_value, address, fhir_endpoint_url
		ORDER BY organization_name
	`, whereClause, filterLateral)

	rows, err := h.db.QueryContext(ctx, query, args...)
	if err != nil {
		log.WithError(err).Error("querying organization export")
		models.WriteError(w, http.StatusInternalServerError, "failed to export organizations")
		return
	}
	defer rows.Close()

	filename := fmt.Sprintf("fhir_organizations_%s.csv", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"organization_name", "identifier_type", "identifier_value",
		"address", "fhir_endpoint_url",
		"fhir_version", "api_developer_name",
	})

	for rows.Next() {
		var orgName string
		var idType, idValue, address, endpointURL, fhirVersion, apiDeveloperName *string

		if err := rows.Scan(
			&orgName, &idType, &idValue, &address, &endpointURL,
			&fhirVersion, &apiDeveloperName,
		); err != nil {
			log.WithError(err).Error("scanning org export row")
			continue
		}
		writer.Write([]string{
			orgName,
			derefStr(idType), derefStr(idValue), derefStr(address),
			derefStr(endpointURL),
			derefStr(fhirVersion), derefStr(apiDeveloperName),
		})
	}
}

func formatCSVValue(v any) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case []byte:
		return string(val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
