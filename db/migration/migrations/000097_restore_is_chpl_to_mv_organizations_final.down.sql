-- Revert to the migration 77 version (without is_chpl columns).

BEGIN;

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
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    string_agg(DISTINCT endpoint_urls_csv, E'\n') as endpoint_urls_csv,
    fhir_versions_csv,
    vendor_names_csv,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(fhir_versions_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as fhir_versions_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(vendor_names_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as vendor_names_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(urls_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as urls_array,
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
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    fhir_versions_csv,
    vendor_names_csv
ORDER BY organization_name;

CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);
CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);
CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);
CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);
CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);
CREATE INDEX idx_mv_orgs_final_search ON mv_organizations_final USING GIN(search_vector);

COMMIT;
