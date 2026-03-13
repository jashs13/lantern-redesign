BEGIN;

DROP MATERIALIZED VIEW IF EXISTS smart_sankey_mv;

CREATE MATERIALIZED VIEW smart_sankey_mv AS
WITH
total AS (
    SELECT COUNT(DISTINCT url) AS total_indexed
    FROM mv_endpoint_export_tbl
),
http200 AS (
    SELECT COUNT(DISTINCT url) AS http200_count
    FROM mv_endpoint_export_tbl
    WHERE http_response = 200
),
well_known AS (
    SELECT COUNT(DISTINCT url) AS smart_http200_count
    FROM mv_endpoint_export_tbl
    WHERE smart_http_response = 200
),
valid_json AS (
    SELECT COUNT(*) AS valid_json_count
    FROM mv_well_known_endpoints
)
SELECT
    t.total_indexed                                                          AS total_indexed,
    h.http200_count                                                          AS http200,
    t.total_indexed - h.http200_count                                        AS no_http200,
    w.smart_http200_count                                                    AS well_known,
    h.http200_count - w.smart_http200_count                                  AS non_well_known,
    v.valid_json_count                                                       AS valid_json,
    w.smart_http200_count - v.valid_json_count                               AS no_valid_json,
    -- Percentages (rounded to 1 decimal place, based on total_indexed)
    ROUND(h.http200_count        * 100.0 / NULLIF(t.total_indexed, 0), 1)   AS http200_pct,
    ROUND((t.total_indexed - h.http200_count) * 100.0 / NULLIF(t.total_indexed, 0), 1) AS no_http200_pct,
    ROUND(w.smart_http200_count  * 100.0 / NULLIF(t.total_indexed, 0), 1)   AS well_known_pct,
    ROUND((h.http200_count - w.smart_http200_count) * 100.0 / NULLIF(t.total_indexed, 0), 1) AS non_well_known_pct,
    ROUND(v.valid_json_count     * 100.0 / NULLIF(t.total_indexed, 0), 1)   AS valid_json_pct,
    ROUND((w.smart_http200_count - v.valid_json_count) * 100.0 / NULLIF(t.total_indexed, 0), 1) AS no_valid_json_pct
FROM total t
CROSS JOIN http200 h
CROSS JOIN well_known w
CROSS JOIN valid_json v;

-- Single-row MV: use constant expression index to enable CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_smart_sankey_mv ON smart_sankey_mv ((1));

COMMIT;
