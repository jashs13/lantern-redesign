BEGIN;

DROP MATERIALIZED VIEW IF EXISTS field_values_kpi_metrics_mv;

CREATE MATERIALIZED VIEW field_values_kpi_metrics_mv AS
WITH field_stats AS (
    SELECT 
        field,
        COUNT(DISTINCT field_value) as unique_values,
        SUM("Endpoints") as total_endpoints
    FROM selected_fhir_endpoints_values_mv
    WHERE field_value != '[Empty]' AND field_value IS NOT NULL AND field_value != ''
    GROUP BY field
),
top_values_per_field AS (
    SELECT 
        field,
        MAX("Endpoints") as max_value_endpoints
    FROM selected_fhir_endpoints_values_mv
    WHERE field_value != '[Empty]' AND field_value IS NOT NULL AND field_value != ''
    GROUP BY field
),
uniformity_stats AS (
    SELECT 
        f.field,
        f.unique_values,
        t.max_value_endpoints,
        f.total_endpoints,
        CASE WHEN f.total_endpoints > 0 
             THEN (t.max_value_endpoints::float / f.total_endpoints) * 100 
             ELSE 0 
        END as uniformity_score
    FROM field_stats f
    JOIN top_values_per_field t ON f.field = t.field
)
SELECT 
    (SELECT COUNT(DISTINCT field) FROM uniformity_stats) AS fields_with_values,
    (SELECT COUNT(DISTINCT field_value) FROM selected_fhir_endpoints_values_mv WHERE field_value != '[Empty]' AND field_value IS NOT NULL AND field_value != '') AS total_unique_values,
    (SELECT field FROM uniformity_stats ORDER BY uniformity_score DESC NULLS LAST, total_endpoints DESC LIMIT 1) AS most_uniform_field,
    (SELECT ROUND(uniformity_score::numeric, 1) FROM uniformity_stats ORDER BY uniformity_score DESC NULLS LAST, total_endpoints DESC LIMIT 1) AS most_uniform_score,
    (SELECT field FROM uniformity_stats ORDER BY unique_values DESC NULLS LAST LIMIT 1) AS most_varied_field,
    (SELECT unique_values FROM uniformity_stats ORDER BY unique_values DESC NULLS LAST LIMIT 1) AS most_varied_score;

CREATE UNIQUE INDEX idx_field_values_kpi_metrics_mv_varied ON field_values_kpi_metrics_mv (most_varied_field);

COMMIT;
