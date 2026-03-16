CREATE MATERIALIZED VIEW mv_profile_stats AS
WITH profiles_per_endpoint AS (
    SELECT url, COUNT(DISTINCT profileurl) AS profile_count
    FROM endpoint_supported_profiles_mv
    WHERE profileurl IS NOT NULL
    GROUP BY url
)
SELECT
    (SELECT COUNT(DISTINCT profileurl)
     FROM endpoint_supported_profiles_mv
     WHERE profileurl IS NOT NULL)::int AS distinct_profiles,
    (SELECT COUNT(DISTINCT profileurl)
     FROM endpoint_supported_profiles_mv
     WHERE profileurl ILIKE '%hl7.org/fhir/us/core%')::int AS us_core_profiles,
    (SELECT COUNT(DISTINCT url)
     FROM endpoint_supported_profiles_mv
     WHERE profileurl IS NOT NULL)::bigint AS endpoints_with_profiles,
    ROUND(AVG(profile_count), 1) AS avg_profiles_per_endpoint
FROM profiles_per_endpoint;
