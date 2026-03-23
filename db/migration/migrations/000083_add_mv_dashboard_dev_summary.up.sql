BEGIN;

CREATE MATERIALIZED VIEW mv_dashboard_dev_summary AS
WITH vendor_endpoints AS (
    -- One row per (vendor, url) with HTTP response + response time
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
