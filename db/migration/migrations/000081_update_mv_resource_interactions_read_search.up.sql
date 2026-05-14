BEGIN;

DROP MATERIALIZED VIEW IF EXISTS mv_resource_interactions CASCADE;

CREATE MATERIALIZED VIEW mv_resource_interactions AS
WITH expanded_resources AS (
  -- one row per (endpoint_id, resource_type, operation_name)
  SELECT
    f.id AS endpoint_id,
    COALESCE(v.name, 'Unknown') AS vendor_name,
    CASE WHEN f.capability_fhir_version = '' THEN 'No Cap Stat'
         ELSE f.capability_fhir_version
    END AS fhir_version,
    resource_elem->>'type' AS resource_type,
    COALESCE(interaction_elem->>'code', 'not specified') AS operation_name
  FROM fhir_endpoints_info f
  LEFT JOIN vendors v ON f.vendor_id = v.id
  LEFT JOIN LATERAL json_array_elements((f.capability_statement->'rest')->0->'resource') resource_elem
    ON TRUE
  LEFT JOIN LATERAL json_array_elements(resource_elem->'interaction') interaction_elem
    ON TRUE
  WHERE f.requested_fhir_version = 'None'
),
endpoint_operations AS (
  -- aggregate to endpoint level so we can evaluate per-endpoint operation sets accurately
  SELECT
    endpoint_id,
    vendor_name,
    fhir_version,
    resource_type,
    ARRAY_AGG(DISTINCT operation_name) AS ep_operations
  FROM expanded_resources
  GROUP BY endpoint_id, vendor_name, fhir_version, resource_type
),
aggregated AS (
  SELECT
    vendor_name,
    fhir_version,
    resource_type,
    COUNT(DISTINCT endpoint_id) AS endpoint_count,
    -- count endpoints that support both read AND search-type for this resource
    COUNT(DISTINCT CASE
      WHEN 'read' = ANY(ep_operations) AND 'search-type' = ANY(ep_operations)
      THEN endpoint_id
    END) AS read_search_count,
    ARRAY_AGG(DISTINCT op) AS operations
  FROM endpoint_operations, LATERAL UNNEST(ep_operations) AS op
  GROUP BY vendor_name, fhir_version, resource_type
)
SELECT * FROM aggregated;

DROP INDEX IF EXISTS mv_resource_interactions_uniq;
CREATE UNIQUE INDEX mv_resource_interactions_uniq
  ON mv_resource_interactions (vendor_name, fhir_version, resource_type);

DROP INDEX IF EXISTS mv_resource_interactions_vendor_name_idx;
CREATE INDEX mv_resource_interactions_vendor_name_idx
  ON mv_resource_interactions (vendor_name);

DROP INDEX IF EXISTS mv_resource_interactions_fhir_version_idx;
CREATE INDEX mv_resource_interactions_fhir_version_idx
  ON mv_resource_interactions (fhir_version);

DROP INDEX IF EXISTS mv_resource_interactions_resource_type_idx;
CREATE INDEX mv_resource_interactions_resource_type_idx
  ON mv_resource_interactions (resource_type);

DROP INDEX IF EXISTS mv_resource_interactions_operations_idx;
CREATE INDEX mv_resource_interactions_operations_idx
  ON mv_resource_interactions USING GIN (operations);

COMMIT;
