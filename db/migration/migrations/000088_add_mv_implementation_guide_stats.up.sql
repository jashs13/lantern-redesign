CREATE MATERIALIZED VIEW mv_implementation_guide_stats AS
WITH
  per_endpoint_ig_counts AS (
    SELECT url, COUNT(DISTINCT implementation_guide) AS ig_count
    FROM mv_implementation_guide
    GROUP BY url
  ),
  most_adopted AS (
    SELECT
      implementation_guide AS most_adopted_name,
      COUNT(DISTINCT url)::int AS most_adopted_count
    FROM mv_implementation_guide
    GROUP BY implementation_guide
    ORDER BY COUNT(DISTINCT url) DESC
    LIMIT 1
  )
SELECT
  (SELECT COUNT(DISTINCT implementation_guide)::int FROM mv_implementation_guide) AS distinct_igs,
  (SELECT COUNT(*)::int FROM per_endpoint_ig_counts)                               AS endpoints_with_igs,
  ROUND(
    (SELECT COUNT(*)::numeric FROM per_endpoint_ig_counts) * 100.0
    / NULLIF(t.indexed_endpoints, 0), 1
  )                                                                                  AS endpoints_with_igs_pct,
  ROUND((SELECT AVG(ig_count)::numeric FROM per_endpoint_ig_counts), 1)            AS avg_igs_per_endpoint,
  ma.most_adopted_name,
  ma.most_adopted_count,
  ROUND(ma.most_adopted_count * 100.0 / NULLIF(t.indexed_endpoints, 0), 1)         AS most_adopted_pct
FROM most_adopted ma, mv_endpoint_totals t;
