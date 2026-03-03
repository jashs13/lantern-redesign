BEGIN;

-- MV 1: Precomputed average response time.
-- Replaces a live AVG() scan of 31.5M rows in fhir_endpoints_metadata (58s).
-- Refresh this with REFRESH MATERIALIZED VIEW CONCURRENTLY mv_avg_response_time;
CREATE MATERIALIZED VIEW mv_avg_response_time AS
SELECT COALESCE(AVG(response_time_seconds), 0) AS avg_response_time
FROM fhir_endpoints_metadata
WHERE http_response = 200 AND response_time_seconds > 0;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX mv_avg_response_time_idx ON mv_avg_response_time ((1));


-- MV 2: Distinct 2-letter US state codes extracted from organization addresses.
-- Replaces a live regexp_matches() expansion over 197K rows in mv_organizations_final (300ms-1.7s).
-- Refresh this after mv_organizations_final is refreshed.
CREATE MATERIALIZED VIEW mv_organization_states AS
SELECT DISTINCT (regexp_matches(addresses_html, '(?:,\s*)([A-Z]{2})(?:\s+\d{5})', 'g'))[1] AS state
FROM mv_organizations_final
WHERE addresses_html IS NOT NULL;

CREATE UNIQUE INDEX mv_organization_states_idx ON mv_organization_states (state);

COMMIT;
