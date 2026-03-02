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
// Accepts optional query params: fhir_versions (comma-separated group names), availability (range string).
func (h *Handler) DownloadEndpointsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	// FHIR version filter (comma-separated group names, same as ListEndpoints)
	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d)", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	// Availability filter
	if avail := q.Get("availability"); avail != "" {
		low, high := parseAvailabilityRange(avail)
		conditions = append(conditions, fmt.Sprintf("availability >= $%d AND availability <= $%d", argIdx, argIdx+1))
		args = append(args, low, high)
		argIdx++
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf("SELECT * FROM endpoint_export_mv %s", whereClause)
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

	// Write header from column names
	cols, err := rows.Columns()
	if err != nil {
		log.WithError(err).Error("getting column names")
		return
	}
	writer.Write(cols)

	// Write data rows
	values := make([]any, len(cols))
	valuePtrs := make([]any, len(cols))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	for rows.Next() {
		if err := rows.Scan(valuePtrs...); err != nil {
			log.WithError(err).Error("scanning export row")
			continue
		}
		record := make([]string, len(cols))
		for i, v := range values {
			record[i] = formatCSVValue(v)
		}
		writer.Write(record)
	}
}

// DownloadOrganizationsCSV streams organization data as a CSV file.
func (h *Handler) DownloadOrganizationsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rows, err := h.db.QueryContext(ctx,
		`SELECT organization_name, identifier_types_csv, identifier_values_csv,
		        addresses_csv, org_urls_csv, endpoint_urls_csv,
		        fhir_versions_csv, vendor_names_csv
		 FROM mv_organizations_final
		 ORDER BY organization_name`)
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
		"Organization Name", "Identifier Types", "Identifier Values",
		"Addresses", "Organization URLs", "FHIR Endpoint URLs",
		"FHIR Versions", "Vendor Names",
	})

	for rows.Next() {
		var orgName string
		var idTypes, idValues, addresses, orgURLs, endpointURLs, fhirVersions, vendorNames *string
		if err := rows.Scan(&orgName, &idTypes, &idValues, &addresses, &orgURLs,
			&endpointURLs, &fhirVersions, &vendorNames); err != nil {
			log.WithError(err).Error("scanning org export row")
			continue
		}
		writer.Write([]string{
			orgName,
			derefStr(idTypes), derefStr(idValues), derefStr(addresses),
			derefStr(orgURLs), derefStr(endpointURLs),
			derefStr(fhirVersions), derefStr(vendorNames),
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
