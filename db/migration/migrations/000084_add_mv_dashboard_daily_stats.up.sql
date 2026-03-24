BEGIN;

CREATE MATERIALIZED VIEW mv_dashboard_daily_stats AS
SELECT
    DATE(created_at) AS stat_date,
    COUNT(*) AS total_queries,
    COUNT(*) FILTER (WHERE http_response >= 200 AND http_response < 300) AS http_2xx,
    COUNT(*) FILTER (WHERE http_response >= 300 AND http_response < 400) AS http_3xx,
    COUNT(*) FILTER (WHERE http_response >= 400 AND http_response < 500) AS http_4xx,
    COUNT(*) FILTER (WHERE http_response >= 500) AS http_5xx,
    COUNT(*) FILTER (WHERE http_response = 0 OR http_response IS NULL) AS http_timeout,
    ROUND(
        COUNT(*) FILTER (WHERE http_response >= 200 AND http_response < 300) * 100.0
        / NULLIF(COUNT(*), 0), 1
    ) AS available_pct,
    ROUND(AVG(response_time_seconds * 1000) FILTER (WHERE response_time_seconds > 0), 1) AS avg_response_time_ms
FROM fhir_endpoints_metadata
WHERE requested_fhir_version = 'None'
  AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE(created_at)
ORDER BY stat_date;

CREATE UNIQUE INDEX idx_mv_dashboard_daily_stats_date ON mv_dashboard_daily_stats (stat_date);

COMMIT;
