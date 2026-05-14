CREATE MATERIALIZED VIEW mv_profile_adoption AS
SELECT
    profileurl                        AS profile_url,
    COALESCE(MAX(profilename), '')    AS profile_name,
    COUNT(DISTINCT url)               AS endpoint_count,
    ROUND(
        COUNT(DISTINCT url) * 100.0
        / NULLIF((SELECT indexed_endpoints FROM mv_endpoint_totals), 0),
        1
    )                                 AS adoption_pct
FROM mv_profiles_paginated
WHERE profileurl IS NOT NULL
GROUP BY profileurl
ORDER BY endpoint_count DESC;

CREATE UNIQUE INDEX mv_profile_adoption_profile_url_idx
    ON mv_profile_adoption (profile_url);
CREATE INDEX mv_profile_adoption_endpoint_count_idx
    ON mv_profile_adoption (endpoint_count DESC);
