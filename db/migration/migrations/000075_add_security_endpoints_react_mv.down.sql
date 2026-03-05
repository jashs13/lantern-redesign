BEGIN;

DROP MATERIALIZED VIEW IF EXISTS security_endpoints_react_mv;

-- Note: pg_trgm extension is NOT dropped here because it may be used by other indexes.
-- Drop manually if needed: DROP EXTENSION IF EXISTS pg_trgm;

COMMIT;
