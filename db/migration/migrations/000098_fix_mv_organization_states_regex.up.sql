BEGIN;

DROP MATERIALIZED VIEW IF EXISTS mv_organization_states;

-- Updated regex: handles both ", NJ 08873" and ", NJ, 088735042, US" formats.
-- The optional comma after the state code (,?\s*) allows the ZIP to follow
-- either a space or a comma-space sequence.
CREATE MATERIALIZED VIEW mv_organization_states AS
SELECT DISTINCT (regexp_matches(addresses_html, ',\s*([A-Z]{2})\s*,?\s*\d{5}', 'g'))[1] AS state
FROM mv_organizations_final
WHERE addresses_html IS NOT NULL;

CREATE UNIQUE INDEX mv_organization_states_idx ON mv_organization_states (state);

COMMIT;
