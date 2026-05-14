BEGIN;

DROP MATERIALIZED VIEW IF EXISTS smart_kpi_metrics_mv;

CREATE MATERIALIZED VIEW smart_kpi_metrics_mv AS
WITH total AS (
    SELECT COUNT(DISTINCT url) AS total_indexed
    FROM mv_endpoint_export_tbl
),
well_known AS (
    SELECT COUNT(*) AS supported
    FROM mv_well_known_endpoints
),
cap_counts AS (
    SELECT capability, COUNT(id) AS cnt
    FROM mv_smart_response_capabilities
    GROUP BY capability
),
most_common AS (
    SELECT capability, cnt
    FROM cap_counts
    ORDER BY cnt DESC
    LIMIT 1
),
avg_caps AS (
    SELECT ROUND(AVG(cap_count), 1) AS avg_capabilities
    FROM (
        SELECT id, COUNT(*) AS cap_count
        FROM mv_smart_response_capabilities
        GROUP BY id
    ) per_endpoint
)
SELECT
    w.supported              AS well_known_supported,
    t.total_indexed - w.supported AS not_supported,
    mc.capability            AS most_common_capability,
    mc.cnt                   AS most_common_count,
    ac.avg_capabilities      AS avg_capabilities
FROM total t
CROSS JOIN well_known w
CROSS JOIN most_common mc
CROSS JOIN avg_caps ac;

CREATE UNIQUE INDEX idx_smart_kpi_metrics_mv ON smart_kpi_metrics_mv (most_common_capability);

COMMIT;
