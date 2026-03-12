#!/bin/sh

log_file="/etc/lantern/logs/refresh_react_materialized_views_logs.txt"

echo "$(date +"%Y-%m-%d %H:%M:%S") - Refreshing and reindexing Lantern React materialized views." >> $log_file

# Refresh and reindex fhir_endpoint_comb_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY fhir_endpoint_comb_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh fhir_endpoint_comb_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS fhir_endpoint_comb_mv_unique_idx;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop fhir_endpoint_comb_mv_unique_idx." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX fhir_endpoint_comb_mv_unique_idx ON fhir_endpoint_comb_mv (id, url, list_source);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create fhir_endpoint_comb_mv_unique_idx." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_fhir_endpoint_comb_mv_search;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_fhir_endpoint_comb_mv_search." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_fhir_endpoint_comb_mv_search ON fhir_endpoint_comb_mv USING GIN(search_vector);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_fhir_endpoint_comb_mv_search." >> $log_file
}

# Refresh and reindex selected_fhir_endpoints_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY selected_fhir_endpoints_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh selected_fhir_endpoints_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_selected_fhir_endpoints_mv_unique;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_selected_fhir_endpoints_mv_unique." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_selected_fhir_endpoints_mv_unique ON selected_fhir_endpoints_mv(id, url, requested_fhir_version);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_selected_fhir_endpoints_mv_unique." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_selected_fhir_endpoints_mv_fhir_version;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_selected_fhir_endpoints_mv_fhir_version." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_selected_fhir_endpoints_mv_fhir_version ON selected_fhir_endpoints_mv(fhir_version);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_selected_fhir_endpoints_mv_fhir_version." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_selected_fhir_endpoints_mv_vendor_name;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_selected_fhir_endpoints_mv_vendor_name." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_selected_fhir_endpoints_mv_vendor_name ON selected_fhir_endpoints_mv(vendor_name);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_selected_fhir_endpoints_mv_vendor_name." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_selected_fhir_endpoints_mv_availability;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_selected_fhir_endpoints_mv_availability." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_selected_fhir_endpoints_mv_availability ON selected_fhir_endpoints_mv(availability);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_selected_fhir_endpoints_mv_availability." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_selected_fhir_endpoints_mv_is_chpl;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_selected_fhir_endpoints_mv_is_chpl." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_selected_fhir_endpoints_mv_is_chpl ON selected_fhir_endpoints_mv(is_chpl);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_selected_fhir_endpoints_mv_is_chpl." >> $log_file
}

# Refresh and reindex mv_endpoint_totals
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_endpoint_totals;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh mv_endpoint_totals." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_endpoint_totals_date;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_endpoint_totals_date." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_mv_endpoint_totals_date ON mv_endpoint_totals(aggregation_date);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_endpoint_totals_date." >> $log_file
}

# Refresh and reindex mv_endpoint_security_counts
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_endpoint_security_counts;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh mv_endpoint_security_counts." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_endpoint_security_counts;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_endpoint_security_counts." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c 'CREATE UNIQUE INDEX idx_mv_endpoint_security_counts ON mv_endpoint_security_counts("Status");' -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_endpoint_security_counts." >> $log_file
}

# Refresh and reindex mv_organizations_final
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organizations_final;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh mv_organizations_final." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_org_id;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_org_id." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_org_id." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_name;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_name." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_name." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_fhir_versions;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_fhir_versions." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_fhir_versions." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_vendor_names;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_vendor_names." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_vendor_names." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_urls;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_urls." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_urls." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_mv_orgs_final_search;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_mv_orgs_final_search." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_mv_orgs_final_search ON mv_organizations_final USING GIN(search_vector);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_mv_orgs_final_search." >> $log_file
}

# Refresh mv_avg_response_time
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW mv_avg_response_time;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh mv_avg_response_time." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS mv_avg_response_time_idx;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop mv_avg_response_time_idx." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX mv_avg_response_time_idx ON mv_avg_response_time ((1));" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create mv_avg_response_time_idx." >> $log_file
}

# Refresh mv_organization_states
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_states;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh mv_organization_states." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS mv_organization_states_idx;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop mv_organization_states_idx." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX mv_organization_states_idx ON mv_organization_states (state);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create mv_organization_states_idx." >> $log_file
}

# Refresh and reindex security_endpoints_react_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY security_endpoints_react_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh security_endpoints_react_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_id;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_id." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_security_react_mv_id ON security_endpoints_react_mv (id);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_id." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_filters;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_filters." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_security_react_mv_filters ON security_endpoints_react_mv (capability_fhir_version, code, vendor_name);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_filters." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_url;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_url." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_security_react_mv_url ON security_endpoints_react_mv (url);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_url." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_url_trgm;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_url_trgm." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_security_react_mv_url_trgm ON security_endpoints_react_mv USING GIN (url gin_trgm_ops);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_url_trgm." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_vendor_trgm;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_vendor_trgm." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_security_react_mv_vendor_trgm ON security_endpoints_react_mv USING GIN (vendor_name gin_trgm_ops);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_vendor_trgm." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_security_react_mv_code_trgm;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_security_react_mv_code_trgm." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE INDEX idx_security_react_mv_code_trgm ON security_endpoints_react_mv USING GIN (code gin_trgm_ops);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_security_react_mv_code_trgm." >> $log_file
}

# Refresh capstat_kpi_metrics_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY capstat_kpi_metrics_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh capstat_kpi_metrics_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_capstat_kpi_metrics_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_capstat_kpi_metrics_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_capstat_kpi_metrics_mv ON capstat_kpi_metrics_mv (average_per_cap_stat);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_capstat_kpi_metrics_mv." >> $log_file
}

# Refresh field_values_kpi_metrics_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY field_values_kpi_metrics_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh field_values_kpi_metrics_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_field_values_kpi_metrics_mv_varied;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_field_values_kpi_metrics_mv_varied." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_field_values_kpi_metrics_mv_varied ON field_values_kpi_metrics_mv (most_varied_field);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_field_values_kpi_metrics_mv_varied." >> $log_file
}

# Refresh validation_kpi_metrics_mv
docker exec -t lantern-back-end-main-postgres-1 psql -t -c "REFRESH MATERIALIZED VIEW CONCURRENTLY validation_kpi_metrics_mv;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to refresh validation_kpi_metrics_mv." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "DROP INDEX IF EXISTS idx_validation_kpi_metrics_mv_rule;" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to drop idx_validation_kpi_metrics_mv_rule." >> $log_file
}

docker exec -t lantern-back-end-main-postgres-1 psql -t -c "CREATE UNIQUE INDEX idx_validation_kpi_metrics_mv_rule ON validation_kpi_metrics_mv (most_failed_rule);" -U lantern -d lantern || {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - Lantern failed to create idx_validation_kpi_metrics_mv_rule." >> $log_file
}

echo "$(date +"%Y-%m-%d %H:%M:%S") - done." >> $log_file
