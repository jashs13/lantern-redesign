package handlers

import (
	"net/http"
	"strconv"
	"sync"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// EndpointDetails returns comprehensive detail for a single endpoint.
func (h *Handler) EndpointDetails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	endpointURL := r.URL.Query().Get("url")
	if endpointURL == "" {
		models.WriteError(w, http.StatusBadRequest, "missing url parameter")
		return
	}
	requestedFHIRVersion := r.URL.Query().Get("requested_fhir_version")
	if requestedFHIRVersion == "" {
		requestedFHIRVersion = "None"
	}

	var detail models.EndpointDetail
	detail.URL = endpointURL

	// Query 1 (sequential): Basic endpoint info — required to check existence before proceeding
	err := h.db.QueryRowContext(ctx,
		`SELECT fi.url, v.name AS vendor_name, fi.capability_fhir_version, fi.tls_version, fi.mime_types,
		        fi.capability_statement::text, fi.smart_response::text, fi.included_fields::text,
		        fi.operation_resource::text,
		        fe.list_source,
		        fi.capability_statement->'software'->>'name' AS software_name,
		        fi.capability_statement->'software'->>'version' AS software_version,
		        CASE WHEN fi.capability_statement IS NOT NULL
		          THEN ARRAY_TO_STRING(ARRAY(
		            SELECT jsonb_array_elements_text(fi.capability_statement::jsonb->'format')
		          ), ', ')
		          ELSE ''
		        END AS format,
		        CASE WHEN fi.capability_statement IS NOT NULL
		          THEN ARRAY_TO_STRING(ARRAY(
		            SELECT elem->>'code'
		            FROM jsonb_array_elements(fi.capability_statement::jsonb->'rest'->0->'security'->'service') svc,
		                 jsonb_array_elements(svc->'coding') elem
		          ), ', ')
		          ELSE ''
		        END AS security_codes,
		        mv.fhir_version
		 FROM fhir_endpoints_info fi
		 LEFT JOIN vendors v ON fi.vendor_id = v.id
		 LEFT JOIN fhir_endpoints fe ON fi.url = fe.url
		 LEFT JOIN LATERAL (
		   SELECT fhir_version FROM fhir_endpoint_comb_mv
		   WHERE url = fi.url AND requested_fhir_version = fi.requested_fhir_version
		   LIMIT 1
		 ) mv ON true
		 WHERE fi.url = $1 AND fi.requested_fhir_version = $2`,
		endpointURL, requestedFHIRVersion,
	).Scan(
		&detail.URL, &detail.VendorName, &detail.CapabilityFHIRVersion,
		&detail.TLSVersion, &detail.MIMETypes,
		&detail.CapabilityStatement, &detail.SMARTResponse,
		&detail.IncludedFields, &detail.OperationResource,
		&detail.ListSource, &detail.SoftwareName, &detail.SoftwareVersion,
		&detail.Format, &detail.Security, &detail.FHIRVersion,
	)
	if err != nil {
		log.WithError(err).WithField("url", endpointURL).Error("querying endpoint info")
		models.WriteError(w, http.StatusNotFound, "endpoint not found")
		return
	}

	// Queries 2–9: Run all remaining queries in parallel
	var wg sync.WaitGroup
	var mu sync.Mutex

	// Query 2: Latest metadata
	wg.Add(1)
	go func() {
		defer wg.Done()
		h.db.QueryRowContext(ctx,
			`SELECT http_response, response_time_seconds, availability, smart_http_response
			 FROM fhir_endpoints_metadata
			 WHERE url = $1 AND requested_fhir_version = $2
			 ORDER BY updated_at DESC LIMIT 1`,
			endpointURL, requestedFHIRVersion,
		).Scan(&detail.HTTPResponse, &detail.ResponseTimeSeconds,
			&detail.Availability, &detail.SMARTHTTPResponse)
	}()

	// Query 3: Organizations
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT organization_name
			 FROM mv_endpoint_list_organizations
			 WHERE url = $1
			 ORDER BY organization_name`,
			endpointURL)
		if err != nil {
			return
		}
		defer rows.Close()
		var orgs []models.EndpointOrganization
		for rows.Next() {
			var org models.EndpointOrganization
			if err := rows.Scan(&org.OrganizationName); err != nil {
				continue
			}
			orgs = append(orgs, org)
		}
		mu.Lock()
		detail.Organizations = orgs
		mu.Unlock()
	}()

	// Query 4: CHPL Products
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT h.name, h.version, h.api_url, h.certification_status,
			        h.certification_date::text, h.certification_edition, h.chpl_id,
			        h.last_modified_in_chpl::text
			 FROM fhir_endpoints_info f
			 JOIN healthit_products_map hm ON f.healthit_mapping_id = hm.id
			 JOIN healthit_products h ON hm.healthit_product_id = h.id
			 WHERE f.url = $1 AND f.requested_fhir_version = $2
			   AND f.healthit_mapping_id IS NOT NULL`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var products []models.EndpointProduct
		for rows.Next() {
			var p models.EndpointProduct
			if err := rows.Scan(&p.Name, &p.Version, &p.APIURL,
				&p.CertificationStatus, &p.CertificationDate,
				&p.CertificationEdition, &p.CHPLID, &p.LastModifiedInCHPL); err != nil {
				continue
			}
			products = append(products, p)
		}
		mu.Lock()
		detail.Products = products
		mu.Unlock()
	}()

	// Query 5: Implementation Guides
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT jsonb_array_elements_text(capability_statement::jsonb->'implementationGuide') AS guide_url
			 FROM fhir_endpoints_info
			 WHERE url = $1 AND requested_fhir_version = $2
			   AND capability_statement IS NOT NULL
			   AND capability_statement::jsonb ? 'implementationGuide'`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var guides []string
		for rows.Next() {
			var guide string
			if err := rows.Scan(&guide); err != nil {
				continue
			}
			guides = append(guides, guide)
		}
		mu.Lock()
		detail.ImplementationGuides = guides
		mu.Unlock()
	}()

	// Query 6: Supported Profiles
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT sp->>'ProfileURL' AS profile_url,
			        sp->>'ProfileName' AS profile_name,
			        sp->>'Resource' AS resource
			 FROM fhir_endpoints_info,
			      jsonb_array_elements(supported_profiles::jsonb) AS sp
			 WHERE url = $1 AND requested_fhir_version = $2
			   AND supported_profiles IS NOT NULL
			   AND supported_profiles::text <> 'null'`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var profiles []models.EndpointProfile
		for rows.Next() {
			var p models.EndpointProfile
			if err := rows.Scan(&p.ProfileURL, &p.ProfileName, &p.Resource); err != nil {
				continue
			}
			profiles = append(profiles, p)
		}
		mu.Lock()
		detail.SupportedProfiles = profiles
		mu.Unlock()
	}()

	// Query 7: Capability fields (required/optional/extension)
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT elem->>'Field' AS field_name,
			        (elem->>'Exists')::boolean AS exists,
			        (elem->>'Extension')::boolean AS is_extension
			 FROM fhir_endpoints_info,
			      jsonb_array_elements(included_fields::jsonb) AS elem
			 WHERE url = $1 AND requested_fhir_version = $2
			   AND included_fields IS NOT NULL
			   AND included_fields::text <> 'null'
			 ORDER BY is_extension, field_name`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var fields []models.CapabilityField
		for rows.Next() {
			var f models.CapabilityField
			if err := rows.Scan(&f.FieldName, &f.Exists, &f.IsExtension); err != nil {
				continue
			}
			fields = append(fields, f)
		}
		mu.Lock()
		detail.CapabilityFields = fields
		mu.Unlock()
	}()

	// Query 8: Operation resources
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT key AS operation, jsonb_array_elements_text(value) AS resource
			 FROM fhir_endpoints_info,
			      jsonb_each(operation_resource::jsonb)
			 WHERE url = $1 AND requested_fhir_version = $2
			   AND operation_resource IS NOT NULL
			   AND operation_resource::text <> 'null'
			 ORDER BY key, resource`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var opResources []models.OperationResource
		for rows.Next() {
			var op models.OperationResource
			if err := rows.Scan(&op.Operation, &op.Resource); err != nil {
				continue
			}
			opResources = append(opResources, op)
		}
		mu.Lock()
		detail.OperationResources = opResources
		mu.Unlock()
	}()

	// Query 9: SMART capabilities
	wg.Add(1)
	go func() {
		defer wg.Done()
		rows, err := h.db.QueryContext(ctx,
			`SELECT jsonb_array_elements_text(smart_response::jsonb->'capabilities') AS capability
			 FROM fhir_endpoints_info
			 WHERE url = $1 AND requested_fhir_version = $2
			   AND smart_response IS NOT NULL
			   AND smart_response::jsonb ? 'capabilities'`,
			endpointURL, requestedFHIRVersion)
		if err != nil {
			return
		}
		defer rows.Close()
		var caps []string
		for rows.Next() {
			var cap string
			if err := rows.Scan(&cap); err != nil {
				continue
			}
			caps = append(caps, cap)
		}
		mu.Lock()
		detail.SMARTCapabilities = caps
		mu.Unlock()
	}()

	wg.Wait()

	// Ensure nil slices become empty arrays in JSON
	if detail.Organizations == nil {
		detail.Organizations = []models.EndpointOrganization{}
	}
	if detail.Products == nil {
		detail.Products = []models.EndpointProduct{}
	}
	if detail.ImplementationGuides == nil {
		detail.ImplementationGuides = []string{}
	}
	if detail.SupportedProfiles == nil {
		detail.SupportedProfiles = []models.EndpointProfile{}
	}
	if detail.CapabilityFields == nil {
		detail.CapabilityFields = []models.CapabilityField{}
	}
	if detail.OperationResources == nil {
		detail.OperationResources = []models.OperationResource{}
	}
	if detail.SMARTCapabilities == nil {
		detail.SMARTCapabilities = []string{}
	}

	models.WriteJSON(w, http.StatusOK, detail)
}

// EndpointResponseTime returns response time series data for an endpoint.
func (h *Handler) EndpointResponseTime(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	endpointURL := r.URL.Query().Get("url")
	if endpointURL == "" {
		models.WriteError(w, http.StatusBadRequest, "missing url parameter")
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
	endpointURL := r.URL.Query().Get("url")
	if endpointURL == "" {
		models.WriteError(w, http.StatusBadRequest, "missing url parameter")
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
