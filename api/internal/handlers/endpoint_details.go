package handlers

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi/v5"
	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// EndpointDetails returns comprehensive detail for a single endpoint.
func (h *Handler) EndpointDetails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	endpointURL, err := url.QueryUnescape(chi.URLParam(r, "url"))
	if err != nil {
		models.WriteError(w, http.StatusBadRequest, "invalid URL parameter")
		return
	}
	requestedFHIRVersion := r.URL.Query().Get("requested_fhir_version")
	if requestedFHIRVersion == "" {
		requestedFHIRVersion = "None"
	}

	var detail models.EndpointDetail
	detail.URL = endpointURL

	// Basic endpoint info
	err = h.db.QueryRowContext(ctx,
		`SELECT url, vendor_name, capability_fhir_version, tls_version, mime_types,
		        capability_statement::text, smart_response::text, included_fields::text,
		        operation_resource::text
		 FROM fhir_endpoints_info fi
		 LEFT JOIN vendors v ON fi.vendor_id = v.id
		 WHERE fi.url = $1 AND fi.requested_fhir_version = $2`,
		endpointURL, requestedFHIRVersion,
	).Scan(
		&detail.URL, &detail.VendorName, &detail.CapabilityFHIRVersion,
		&detail.TLSVersion, &detail.MIMETypes,
		&detail.CapabilityStatement, &detail.SMARTResponse,
		&detail.IncludedFields, &detail.OperationResource,
	)
	if err != nil {
		log.WithError(err).WithField("url", endpointURL).Error("querying endpoint info")
		models.WriteError(w, http.StatusNotFound, "endpoint not found")
		return
	}

	// Latest metadata
	h.db.QueryRowContext(ctx,
		`SELECT http_response, response_time_seconds, smart_http_response, availability
		 FROM fhir_endpoints_metadata
		 WHERE url = $1 AND requested_fhir_version = $2
		 ORDER BY updated_at DESC LIMIT 1`,
		endpointURL, requestedFHIRVersion,
	).Scan(&detail.HTTPResponse, &detail.ResponseTimeSeconds,
		&detail.SMARTHTTPResponse, &detail.Availability)

	// Organizations
	orgRows, err := h.db.QueryContext(ctx,
		`SELECT eo.organization_npi_id, n.name, eo.confidence
		 FROM endpoint_organization eo
		 LEFT JOIN npi_organizations n ON eo.organization_npi_id = n.npi_id
		 WHERE eo.url = $1`, endpointURL)
	if err == nil {
		defer orgRows.Close()
		for orgRows.Next() {
			var org models.EndpointOrganization
			if err := orgRows.Scan(&org.OrganizationNPIID, &org.OrganizationName, &org.Confidence); err != nil {
				continue
			}
			detail.Organizations = append(detail.Organizations, org)
		}
	}
	if detail.Organizations == nil {
		detail.Organizations = []models.EndpointOrganization{}
	}

	// Products (CHPL)
	prodRows, err := h.db.QueryContext(ctx,
		`SELECT h.name, h.version, h.api_url, h.certification_status,
		        h.certification_date::text, h.certification_edition, h.chpl_id,
		        h.last_modified_in_chpl::text
		 FROM fhir_endpoints_info f
		 JOIN healthit_products_map hm ON f.healthit_mapping_id = hm.id
		 JOIN healthit_products h ON hm.healthit_product_id = h.id
		 WHERE f.url = $1 AND f.requested_fhir_version = $2
		   AND f.healthit_mapping_id IS NOT NULL`,
		endpointURL, requestedFHIRVersion)
	if err == nil {
		defer prodRows.Close()
		for prodRows.Next() {
			var p models.EndpointProduct
			if err := prodRows.Scan(&p.Name, &p.Version, &p.APIURL,
				&p.CertificationStatus, &p.CertificationDate,
				&p.CertificationEdition, &p.CHPLID, &p.LastModifiedInCHPL); err != nil {
				continue
			}
			detail.Products = append(detail.Products, p)
		}
	}
	if detail.Products == nil {
		detail.Products = []models.EndpointProduct{}
	}

	models.WriteJSON(w, http.StatusOK, detail)
}

// EndpointResponseTime returns response time series data for an endpoint.
func (h *Handler) EndpointResponseTime(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	endpointURL, err := url.QueryUnescape(chi.URLParam(r, "url"))
	if err != nil {
		models.WriteError(w, http.StatusBadRequest, "invalid URL parameter")
		return
	}
	requestedFHIRVersion := r.URL.Query().Get("requested_fhir_version")
	if requestedFHIRVersion == "" {
		requestedFHIRVersion = "None"
	}

	// Default: 7 days of data, bucketed by query interval
	daysStr := r.URL.Query().Get("days")
	days := 7
	if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 365 {
		days = d
	}
	bucketSeconds := 82800 // 23 hours (default query interval)
	dateRangeSeconds := days * 86400

	rows, err := h.db.QueryContext(ctx,
		`SELECT date.datetime AS time, response_time_seconds AS response
		 FROM (
			SELECT floor(extract(epoch from updated_at)/$1)*$1 AS datetime,
			       response_time_seconds
			FROM fhir_endpoints_metadata
			WHERE response_time_seconds > 0
			  AND url = $2
			  AND requested_fhir_version = $3
		 ) AS date,
		 (
			SELECT max(floor(extract(epoch from updated_at)/$1)*$1) AS maximum
			FROM fhir_endpoints_metadata
			WHERE url = $2 AND requested_fhir_version = $3
		 ) AS maxdate
		 WHERE date.datetime BETWEEN (maxdate.maximum - $4) AND maxdate.maximum
		 ORDER BY time`,
		bucketSeconds, endpointURL, requestedFHIRVersion, dateRangeSeconds)
	if err != nil {
		log.WithError(err).Error("querying response time series")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch response time data")
		return
	}
	defer rows.Close()

	var points []models.ResponseTimePoint
	for rows.Next() {
		var p models.ResponseTimePoint
		if err := rows.Scan(&p.Time, &p.Response); err != nil {
			continue
		}
		points = append(points, p)
	}
	if points == nil {
		points = []models.ResponseTimePoint{}
	}
	models.WriteJSON(w, http.StatusOK, points)
}

// EndpointHTTPHistory returns HTTP response code history for an endpoint.
func (h *Handler) EndpointHTTPHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	endpointURL, err := url.QueryUnescape(chi.URLParam(r, "url"))
	if err != nil {
		models.WriteError(w, http.StatusBadRequest, "invalid URL parameter")
		return
	}
	requestedFHIRVersion := r.URL.Query().Get("requested_fhir_version")
	if requestedFHIRVersion == "" {
		requestedFHIRVersion = "None"
	}

	daysStr := r.URL.Query().Get("days")
	days := 7
	if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 365 {
		days = d
	}
	dateRangeSeconds := days * 86400

	rows, err := h.db.QueryContext(ctx,
		`SELECT http_responses.http_response, http_responses.datetime AS time
		 FROM (
			SELECT http_response, floor(extract(epoch from updated_at)) AS datetime
			FROM fhir_endpoints_metadata
			WHERE url = $1 AND requested_fhir_version = $2
		 ) AS http_responses,
		 (
			SELECT max(floor(extract(epoch from updated_at))) AS maximum
			FROM fhir_endpoints_metadata
			WHERE url = $1 AND requested_fhir_version = $2
		 ) AS maxdate
		 WHERE http_responses.datetime BETWEEN (maxdate.maximum - $3) AND maxdate.maximum
		 ORDER BY time`,
		endpointURL, requestedFHIRVersion, dateRangeSeconds)
	if err != nil {
		log.WithError(err).Error("querying HTTP history")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch HTTP history")
		return
	}
	defer rows.Close()

	var points []models.HTTPHistoryPoint
	for rows.Next() {
		var p models.HTTPHistoryPoint
		if err := rows.Scan(&p.HTTPResponse, &p.Time); err != nil {
			continue
		}
		points = append(points, p)
	}
	if points == nil {
		points = []models.HTTPHistoryPoint{}
	}
	models.WriteJSON(w, http.StatusOK, points)
}
