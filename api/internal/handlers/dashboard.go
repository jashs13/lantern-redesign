package handlers

import (
	"net/http"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// DashboardSummary returns aggregated dashboard data from multiple MVs.
func (h *Handler) DashboardSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vendor := r.URL.Query().Get("vendor")

	var summary models.DashboardSummary

	// 1. Endpoint totals
	err := h.db.QueryRowContext(ctx,
		`SELECT COALESCE(all_endpoints, 0), COALESCE(indexed_endpoints, 0),
		        COALESCE(nonindexed_endpoints, 0), COALESCE(last_updated::text, '')
		 FROM mv_endpoint_totals LIMIT 1`).Scan(
		&summary.Totals.AllEndpoints,
		&summary.Totals.IndexedEndpoints,
		&summary.Totals.NonIndexedEndpoints,
		&summary.Totals.LastUpdated,
	)
	if err != nil {
		log.WithError(err).Error("querying endpoint totals")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch dashboard data")
		return
	}

	// 1a. Organizations count
	err = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM mv_organizations_final`).Scan(&summary.Totals.Organizations)
	if err != nil {
		log.WithError(err).Warn("querying organizations count")
	}

	// 1b. Average response time — read from precomputed MV (live AVG over 31.5M rows takes 58s)
	err = h.db.QueryRowContext(ctx,
		`SELECT COALESCE(avg_response_time, 0) FROM mv_avg_response_time LIMIT 1`).Scan(&summary.Totals.AvgResponseTime)
	if err != nil {
		log.WithError(err).Warn("querying average response time")
	}

	// 2. Response tally
	err = h.db.QueryRowContext(ctx,
		`SELECT COALESCE(http_200, 0), COALESCE(http_404, 0), COALESCE(http_503, 0)
		 FROM mv_response_tally LIMIT 1`).Scan(
		&summary.ResponseTally.HTTP200,
		&summary.ResponseTally.HTTP404,
		&summary.ResponseTally.HTTP503,
	)
	if err != nil {
		log.WithError(err).Warn("querying response tally")
		// Non-fatal: continue with zero values
	}

	// 3. Vendor FHIR counts
	rows, err := h.db.QueryContext(ctx,
		`SELECT vendor_name, fhir_version, n, sort_order
		 FROM mv_vendor_fhir_counts
		 ORDER BY sort_order, vendor_name`)
	if err != nil {
		log.WithError(err).Error("querying vendor FHIR counts")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch vendor counts")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var vc models.VendorFHIRCount
		if err := rows.Scan(&vc.VendorName, &vc.FHIRVersion, &vc.Count, &vc.SortOrder); err != nil {
			log.WithError(err).Error("scanning vendor count row")
			continue
		}
		summary.VendorCounts = append(summary.VendorCounts, vc)
	}
	if summary.VendorCounts == nil {
		summary.VendorCounts = []models.VendorFHIRCount{}
	}

	// 4. HTTP response codes
	vendorFilter := "ALL_DEVELOPERS"
	if vendor != "" {
		vendorFilter = vendor
	}
	httpRows, err := h.db.QueryContext(ctx,
		`SELECT http_code, code_label, count_endpoints
		 FROM mv_http_responses
		 WHERE vendor_name = $1
		 ORDER BY http_code`, vendorFilter)
	if err != nil {
		log.WithError(err).Warn("querying HTTP responses")
	} else {
		defer httpRows.Close()
		for httpRows.Next() {
			var hc models.HTTPCodeCount
			if err := httpRows.Scan(&hc.HTTPCode, &hc.CodeLabel, &hc.CountEndpoints); err != nil {
				continue
			}
			summary.HTTPCodes = append(summary.HTTPCodes, hc)
		}
	}
	if summary.HTTPCodes == nil {
		summary.HTTPCodes = []models.HTTPCodeCount{}
	}

	// 5. Top Organizations — ordered by endpoint count, junk names filtered out
	orgRows, err := h.db.QueryContext(ctx,
		`SELECT organization_name
		 FROM mv_organizations_final
		 WHERE organization_name IS NOT NULL
		   AND organization_name ~ '^[A-Za-z0-9]'
		 ORDER BY array_length(urls_array, 1) DESC NULLS LAST, organization_name ASC
		 LIMIT 6`)
	if err != nil {
		log.WithError(err).Warn("querying top organizations")
	} else {
		defer orgRows.Close()
		for orgRows.Next() {
			var org string
			if err := orgRows.Scan(&org); err == nil {
				summary.TopOrganizations = append(summary.TopOrganizations, org)
			}
		}
	}
	if summary.TopOrganizations == nil {
		summary.TopOrganizations = []string{}
	}

	// 6. Developer summary (from mv_dashboard_dev_summary)
	devRows, err := h.db.QueryContext(ctx,
		`SELECT vendor_name, endpoint_count, org_count,
		        available_count, degraded_count, down_count,
		        available_pct, degraded_pct, down_pct,
		        avg_response_time_ms, sort_order
		 FROM mv_dashboard_dev_summary
		 ORDER BY sort_order, vendor_name`)
	if err != nil {
		log.WithError(err).Warn("querying developer summary")
	} else {
		defer devRows.Close()
		for devRows.Next() {
			var ds models.DevSummary
			if err := devRows.Scan(
				&ds.VendorName, &ds.EndpointCount, &ds.OrgCount,
				&ds.AvailableCount, &ds.DegradedCount, &ds.DownCount,
				&ds.AvailablePct, &ds.DegradedPct, &ds.DownPct,
				&ds.AvgResponseTime, &ds.SortOrder,
			); err != nil {
				log.WithError(err).Error("scanning dev summary row")
				continue
			}
			summary.DevSummary = append(summary.DevSummary, ds)
		}
	}
	if summary.DevSummary == nil {
		summary.DevSummary = []models.DevSummary{}
	}

	models.WriteJSON(w, http.StatusOK, summary)
}
