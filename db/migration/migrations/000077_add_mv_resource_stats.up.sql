BEGIN;

CREATE MATERIALIZED VIEW mv_resource_stats AS
WITH
distinct_count AS (
    SELECT COUNT(DISTINCT resource_type)::int AS distinct_resources
    FROM mv_resource_interactions
),
avg_resources AS (
    SELECT ROUND(SUM(endpoint_count)::numeric / NULLIF(MAX(t.indexed_endpoints), 0), 1) AS avg_per_endpoint
    FROM mv_resource_interactions, mv_endpoint_totals t
),
most_supported AS (
    SELECT
        resource_type AS most_supported_resource,
        ROUND(SUM(endpoint_count) * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS most_supported_percent
    FROM mv_resource_interactions, mv_endpoint_totals t
    GROUP BY resource_type, t.indexed_endpoints
    ORDER BY SUM(endpoint_count) DESC
    LIMIT 1
),
uscdi_list (resource_type) AS (
    VALUES
        ('Patient'), ('AllergyIntolerance'), ('Condition'),
        ('DiagnosticReport'), ('DocumentReference'), ('Goal'),
        ('Immunization'), ('MedicationRequest'), ('Observation'),
        ('Procedure'), ('CarePlan'), ('CareTeam'), ('Provenance')
),
uscdi_count AS (
    SELECT COUNT(*)::int AS n FROM uscdi_list
),
endpoint_resources AS (
    SELECT
        f.id AS endpoint_id,
        COUNT(DISTINCT resource_elem->>'type') FILTER (
            WHERE resource_elem->>'type' IN (SELECT resource_type FROM uscdi_list)
        ) AS uscdi_supported
    FROM fhir_endpoints_info f
    LEFT JOIN LATERAL json_array_elements(
        (f.capability_statement->'rest')->0->'resource'
    ) resource_elem ON TRUE
    WHERE f.requested_fhir_version = 'None'
        AND f.capability_statement IS NOT NULL
    GROUP BY f.id
),
uscdi_coverage AS (
    SELECT
        ROUND(
            COUNT(*) FILTER (WHERE er.uscdi_supported = uc.n) * 100.0
            / NULLIF(MAX(t.indexed_endpoints), 0),
            1
        ) AS uscdi_coverage_percent
    FROM endpoint_resources er
    CROSS JOIN uscdi_count uc
    CROSS JOIN mv_endpoint_totals t
)
SELECT
    d.distinct_resources,
    a.avg_per_endpoint,
    ms.most_supported_resource,
    ms.most_supported_percent,
    uc.uscdi_coverage_percent
FROM distinct_count d, avg_resources a, most_supported ms, uscdi_coverage uc;

COMMIT;
