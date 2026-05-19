BEGIN;

DROP MATERIALIZED VIEW IF EXISTS mv_organization_states;

-- Revert to original regex from migration 78
CREATE MATERIALIZED VIEW mv_organization_states AS
SELECT DISTINCT (regexp_matches(addresses_html, '(?:,\s*)([A-Z]{2})(?:\s+\d{5})', 'g'))[1] AS state
FROM mv_organizations_final
WHERE addresses_html IS NOT NULL;

CREATE UNIQUE INDEX mv_organization_states_idx ON mv_organization_states (state);

COMMIT;
