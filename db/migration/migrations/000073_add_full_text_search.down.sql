BEGIN;

-- =============================================================
-- 1. Recreate fhir_endpoint_comb_mv WITHOUT search_vector
-- =============================================================

DROP MATERIALIZED VIEW IF EXISTS selected_fhir_endpoints_mv;
DROP MATERIALIZED VIEW IF EXISTS fhir_endpoint_comb_mv;

CREATE MATERIALIZED VIEW fhir_endpoint_comb_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    t.url, t.endpoint_names, t.info_created, t.info_updated,
    t.list_source, t.vendor_name, t.capability_fhir_version,
    t.fhir_version, t.format, t.http_response, t.response_time_seconds,
    t.smart_http_response, t.errors, t.availability, t.kind,
    t.requested_fhir_version, t.is_chpl, t.status, t.cap_stat_exists
FROM (
    SELECT DISTINCT ON (e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version)
        e.url, e.endpoint_names, e.info_created, e.info_updated,
        e.list_source, e.vendor_name, e.capability_fhir_version,
        e.fhir_version, e.format, e.http_response, e.response_time_seconds,
        e.smart_http_response, e.errors, e.availability, e.kind,
        e.requested_fhir_version, lsi.is_chpl,
        CASE
            WHEN e.http_response = 200 THEN CONCAT('Success: ', e.http_response, ' - ', r.code_label)
            WHEN e.http_response IS NULL OR e.http_response = 0 THEN 'Failure: 0 - NA'
            ELSE CONCAT('Failure: ', e.http_response, ' - ', r.code_label)
        END AS status,
        LOWER(CASE
            WHEN e.kind != 'instance' THEN 'true*'::TEXT
            ELSE e.cap_stat_exists::TEXT
        END) AS cap_stat_exists
    FROM endpoint_export_mv e
    LEFT JOIN mv_http_responses r ON e.http_response = r.http_code
    LEFT JOIN list_source_info lsi ON e.list_source = lsi.list_source
    ORDER BY e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version
) t;

CREATE UNIQUE INDEX fhir_endpoint_comb_mv_unique_idx ON fhir_endpoint_comb_mv (id, url, list_source);

-- Recreate selected_fhir_endpoints_mv (original definition)
CREATE MATERIALIZED VIEW selected_fhir_endpoints_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    e.url, e.endpoint_names, e.info_created, e.info_updated,
    e.list_source, e.vendor_name, e.capability_fhir_version,
    e.fhir_version, e.format, e.http_response, e.response_time_seconds,
    e.smart_http_response, e.errors, e.availability * 100 AS availability,
    e.kind, e.requested_fhir_version, lsi.is_chpl, e.status,
    e.cap_stat_exists,
    CONCAT('<a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing additional information for this endpoint."
            onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
            onclick="Shiny.setInputValue(''endpoint_popup'',''', e.url, '&&', e.requested_fhir_version, ''',{priority: ''event''});">', e.url, '</a>')
    AS "urlModal",
    CASE
        WHEN e.endpoint_names IS NOT NULL
             AND array_length(string_to_array(e.endpoint_names, ';'), 1) > 5
        THEN CONCAT(
            array_to_string(ARRAY(SELECT unnest(string_to_array(e.endpoint_names, ';')) LIMIT 5), '; '),
            '; <a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing the endpoint''s entire list of API information source names."
                onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
                onclick="Shiny.setInputValue(''show_details'',''', e.url, ''',{priority: ''event''});"> Click For More... </a>'
        )
        ELSE e.endpoint_names
    END AS condensed_endpoint_names
FROM fhir_endpoint_comb_mv e
LEFT JOIN list_source_info lsi ON e.list_source = lsi.list_source;

CREATE UNIQUE INDEX idx_selected_fhir_endpoints_mv_unique ON selected_fhir_endpoints_mv(id, url, requested_fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_fhir_version ON selected_fhir_endpoints_mv(fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_vendor_name ON selected_fhir_endpoints_mv(vendor_name);
CREATE INDEX idx_selected_fhir_endpoints_mv_availability ON selected_fhir_endpoints_mv(availability);
CREATE INDEX idx_selected_fhir_endpoints_mv_is_chpl ON selected_fhir_endpoints_mv(is_chpl);

-- =============================================================
-- 2. Recreate mv_organizations_final WITHOUT search_vector
-- =============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_organizations_final;

CREATE MATERIALIZED VIEW mv_organizations_final AS
SELECT
    ROW_NUMBER() OVER (ORDER BY organization_name) as org_id,
    organization_name,
    identifier_types_html, identifier_values_html, addresses_html,
    org_urls_html,
    string_agg(DISTINCT endpoint_urls_html, '<br/>') as endpoint_urls_html,
    fhir_versions_html, vendor_names_html,
    identifier_types_csv, identifier_values_csv, addresses_csv,
    org_urls_csv,
    string_agg(DISTINCT endpoint_urls_csv, E'\n') as endpoint_urls_csv,
    fhir_versions_csv, vendor_names_csv,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(fhir_versions_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as fhir_versions_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(vendor_names_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as vendor_names_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(urls_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as urls_array
FROM mv_organizations_aggregated
GROUP BY
    organization_name, identifier_types_html, identifier_values_html,
    addresses_html, org_urls_html, fhir_versions_html, vendor_names_html,
    identifier_types_csv, identifier_values_csv, addresses_csv,
    org_urls_csv, fhir_versions_csv, vendor_names_csv
ORDER BY organization_name;

CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);
CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);
CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);
CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);
CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);

-- =============================================================
-- 3. Remove vendors search_vector
-- =============================================================

DROP TRIGGER IF EXISTS trg_vendors_search ON vendors;
DROP FUNCTION IF EXISTS vendors_search_trigger();
DROP INDEX IF EXISTS idx_vendors_search;
ALTER TABLE vendors DROP COLUMN IF EXISTS search_vector;

COMMIT;
