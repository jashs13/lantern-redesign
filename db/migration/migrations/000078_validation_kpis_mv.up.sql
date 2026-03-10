BEGIN;

DROP MATERIALIZED VIEW IF EXISTS validation_kpi_metrics_mv;

CREATE MATERIALIZED VIEW validation_kpi_metrics_mv AS
WITH totals AS (
    SELECT 
        COUNT(DISTINCT url) as total_endpoints,
        COUNT(DISTINCT CASE WHEN valid = false THEN url END) as endpoints_with_failures,
        COUNT(DISTINCT rule_name) as total_rules
    FROM mv_validation_results_plot
),
failures_per_rule AS (
    SELECT 
        rule_name,
        SUM(CASE WHEN valid = false THEN 1 ELSE 0 END) as failure_count
    FROM mv_validation_results_plot
    GROUP BY rule_name
)
SELECT 
    t.total_endpoints - t.endpoints_with_failures as passing_all,
    t.endpoints_with_failures as with_failures,
    CASE WHEN t.total_endpoints > 0 
         THEN ROUND(((t.total_endpoints - t.endpoints_with_failures)::numeric / t.total_endpoints) * 100, 1)
         ELSE 0 
    END as pass_rate,
    t.total_rules as total_rules,
    f.rule_name as most_failed_rule,
    f.failure_count as max_failures
FROM totals t
CROSS JOIN (
    SELECT rule_name, failure_count 
    FROM failures_per_rule 
    ORDER BY failure_count DESC 
    LIMIT 1
) f;

CREATE UNIQUE INDEX idx_validation_kpi_metrics_mv_rule ON validation_kpi_metrics_mv (most_failed_rule);

COMMIT;
