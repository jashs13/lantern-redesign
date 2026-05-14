BEGIN;

-- Enable trigram extension for fast ILIKE search on url column.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- React-friendly security endpoints MV.
-- Sources from selected_security_endpoints_mv which already has plain-text url and
-- organization_names columns (the html versions are url_modal/condensed_organization_names).
-- Uses the existing id for the unique index to handle duplicate (url, vendor, fhir, tls, code)
-- rows that differ only by org_names.
CREATE MATERIALIZED VIEW security_endpoints_react_mv AS
SELECT
  id,
  url,
  organization_names AS org_names,
  (array_length(string_to_array(organization_names, ';'), 1) > 5) AS has_more_orgs,
  vendor_name,
  capability_fhir_version,
  tls_version,
  code
FROM selected_security_endpoints_mv;

CREATE UNIQUE INDEX idx_security_react_mv_id
  ON security_endpoints_react_mv (id);

-- Index for common filter combinations (fhir version, auth type, vendor)
CREATE INDEX idx_security_react_mv_filters
  ON security_endpoints_react_mv (capability_fhir_version, code, vendor_name);

-- B-tree index for ORDER BY url
CREATE INDEX idx_security_react_mv_url
  ON security_endpoints_react_mv (url);

-- Trigram GIN index for fast ILIKE search on url (e.g. url ILIKE '%epic%')
CREATE INDEX idx_security_react_mv_url_trgm
  ON security_endpoints_react_mv USING GIN (url gin_trgm_ops);

-- Trigram GIN indexes for vendor_name and code search
CREATE INDEX idx_security_react_mv_vendor_trgm
  ON security_endpoints_react_mv USING GIN (vendor_name gin_trgm_ops);

CREATE INDEX idx_security_react_mv_code_trgm
  ON security_endpoints_react_mv USING GIN (code gin_trgm_ops);

COMMIT;
