-- Migration 77 dropped and recreated mv_organizations_final to add search_vector
-- but omitted the is_chpl_html, is_chpl_csv, and is_chpl_array columns that were
-- added in migration 75. The original Shiny dashboard queries these columns,
-- so this migration restores them.

BEGIN;

-- 1. Drop dependent MVs
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_dev_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_organization_states;

-- 2. Drop and recreate mv_organizations_final with is_chpl columns restored
DROP MATERIALIZED VIEW IF EXISTS mv_organizations_final;

CREATE MATERIALIZED VIEW mv_organizations_final AS
SELECT
    ROW_NUMBER() OVER (ORDER BY organization_name) as org_id,
    organization_name,
    identifier_types_html,
    identifier_values_html,
    addresses_html,
    org_urls_html,
    string_agg(DISTINCT endpoint_urls_html, '<br/>') as endpoint_urls_html,
    fhir_versions_html,
    vendor_names_html,
    is_chpl_html,
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    string_agg(DISTINCT endpoint_urls_csv, E'\n') as endpoint_urls_csv,
    fhir_versions_csv,
    vendor_names_csv,
    is_chpl_csv,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(fhir_versions_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as fhir_versions_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(vendor_names_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as vendor_names_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(urls_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as urls_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(is_chpl_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as is_chpl_array,
    to_tsvector('simple',
        coalesce(organization_name, '') || ' ' ||
        coalesce(vendor_names_csv, '') || ' ' ||
        coalesce(addresses_csv, '') || ' ' ||
        coalesce(identifier_values_csv, '')
    ) AS search_vector
FROM mv_organizations_aggregated
GROUP BY
    organization_name,
    identifier_types_html,
    identifier_values_html,
    addresses_html,
    org_urls_html,
    fhir_versions_html,
    vendor_names_html,
    is_chpl_html,
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    fhir_versions_csv,
    vendor_names_csv,
    is_chpl_csv
ORDER BY organization_name;

CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);
CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);
CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);
CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);
CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);
CREATE INDEX idx_mv_orgs_final_is_chpl ON mv_organizations_final USING GIN(is_chpl_array);
CREATE INDEX idx_mv_orgs_final_search ON mv_organizations_final USING GIN(search_vector);

-- 3. Recreate mv_organization_states (from migration 78)
CREATE MATERIALIZED VIEW mv_organization_states AS
SELECT DISTINCT (regexp_matches(addresses_html, '(?:,\s*)([A-Z]{2})(?:\s+\d{5})', 'g'))[1] AS state
FROM mv_organizations_final
WHERE addresses_html IS NOT NULL;

CREATE UNIQUE INDEX mv_organization_states_idx ON mv_organization_states (state);

-- 4. Recreate mv_dashboard_dev_summary (from migration 92)
CREATE MATERIALIZED VIEW mv_dashboard_dev_summary AS
WITH vendor_endpoints AS (
    SELECT
        COALESCE(v.name, 'Unknown') AS vendor_name,
        f.url,
        m.http_response,
        m.response_time_seconds
    FROM fhir_endpoints_info f
    LEFT JOIN vendors v ON f.vendor_id = v.id
    LEFT JOIN fhir_endpoints_metadata m ON f.metadata_id = m.id
    WHERE f.requested_fhir_version = 'None'
),
per_vendor AS (
    SELECT vendor_name,
           COUNT(DISTINCT url) AS endpoint_count,
           COUNT(DISTINCT url) FILTER (WHERE http_response >= 200 AND http_response < 300) AS available_count,
           COUNT(DISTINCT url) FILTER (WHERE http_response >= 300 AND http_response < 500) AS degraded_count,
           COUNT(DISTINCT url) FILTER (WHERE http_response >= 500 OR http_response = 0 OR http_response IS NULL) AS down_count,
           COALESCE(ROUND(AVG(response_time_seconds) FILTER (WHERE response_time_seconds >= 0) * 1000), 0) AS avg_response_time_ms
    FROM vendor_endpoints
    GROUP BY vendor_name
),
org_counts AS (
    SELECT v_name AS vendor_name,
           COUNT(*) AS org_count
    FROM mv_organizations_final, unnest(vendor_names_array) AS v_name
    GROUP BY v_name
)
SELECT
    pv.vendor_name,
    pv.endpoint_count::INTEGER,
    COALESCE(oc.org_count, 0)::INTEGER AS org_count,
    pv.available_count::INTEGER,
    pv.degraded_count::INTEGER,
    pv.down_count::INTEGER,
    CASE WHEN pv.endpoint_count > 0 THEN ROUND(pv.available_count * 100.0 / pv.endpoint_count, 1) ELSE 0 END AS available_pct,
    CASE WHEN pv.endpoint_count > 0 THEN ROUND(pv.degraded_count * 100.0 / pv.endpoint_count, 1) ELSE 0 END AS degraded_pct,
    CASE WHEN pv.endpoint_count > 0 THEN ROUND(pv.down_count * 100.0 / pv.endpoint_count, 1) ELSE 0 END AS down_pct,
    pv.avg_response_time_ms::INTEGER AS avg_response_time_ms,
    ROW_NUMBER() OVER (ORDER BY pv.endpoint_count DESC, pv.vendor_name)::INTEGER AS sort_order
FROM per_vendor pv
LEFT JOIN org_counts oc ON pv.vendor_name = oc.vendor_name
ORDER BY sort_order;

CREATE UNIQUE INDEX idx_mv_dashboard_dev_summary_vendor ON mv_dashboard_dev_summary (vendor_name);
CREATE INDEX idx_mv_dashboard_dev_summary_sort ON mv_dashboard_dev_summary (sort_order);

COMMIT;
