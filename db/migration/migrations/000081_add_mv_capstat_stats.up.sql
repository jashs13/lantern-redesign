BEGIN;

CREATE MATERIALIZED VIEW mv_capstat_stats AS
SELECT
    ROUND(AVG(size))::bigint                                        AS avg_size,
    PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY size)::bigint      AS median_size,
    MAX(size)::bigint                                               AS largest_size,
    MIN(size)::bigint                                               AS smallest_size
FROM mv_capstat_sizes_tbl;

COMMIT;
