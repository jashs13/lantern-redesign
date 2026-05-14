BEGIN;

DROP MATERIALIZED VIEW IF EXISTS capstat_kpi_metrics_mv;

CREATE MATERIALIZED VIEW capstat_kpi_metrics_mv AS
SELECT
    (SELECT COALESCE(COUNT(field) / NULLIF(COUNT(DISTINCT url), 0), 0)
     FROM (
         SELECT url, json_array_elements(included_fields::json) ->> 'Field' as field,
         json_array_elements(included_fields::json) ->> 'Exists' as exist
         FROM fhir_endpoints_info
         WHERE included_fields::text <> 'null'
     ) t
     WHERE exist = 'true') AS average_per_cap_stat,

    (SELECT COUNT(DISTINCT field)
     FROM (
         SELECT url, json_array_elements(included_fields::json) ->> 'Field' as field,
         json_array_elements(included_fields::json) ->> 'Extension' as extension
         FROM fhir_endpoints_info
         WHERE included_fields::text <> 'null'
     ) t
     WHERE extension = 'true') AS extension_count,

    (SELECT COUNT(DISTINCT field)
     FROM (
         SELECT url, json_array_elements(included_fields::json) ->> 'Field' as field,
         json_array_elements(included_fields::json) ->> 'Extension' as extension
         FROM fhir_endpoints_info
         WHERE included_fields::text <> 'null'
     ) t
     WHERE extension = 'false'
     AND field NOT IN ('status', 'kind', 'fhirVersion', 'format', 'date')) AS optional_count;

CREATE UNIQUE INDEX idx_capstat_kpi_metrics_mv ON capstat_kpi_metrics_mv (average_per_cap_stat);

COMMIT;
