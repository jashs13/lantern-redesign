CREATE MATERIALIZED VIEW mv_resource_operation_support AS
WITH expanded_resources AS (
  SELECT
    f.id AS endpoint_id,
    resource_elem->>'type' AS resource_type,
    COALESCE(interaction_elem->>'code', '') AS operation_name
  FROM fhir_endpoints_info f
  LEFT JOIN LATERAL json_array_elements((f.capability_statement->'rest')->0->'resource')
    resource_elem ON TRUE
  LEFT JOIN LATERAL json_array_elements(resource_elem->'interaction')
    interaction_elem ON TRUE
  WHERE f.requested_fhir_version = 'None'
    AND resource_elem IS NOT NULL
    AND interaction_elem IS NOT NULL
),
endpoint_ops AS (
  SELECT DISTINCT endpoint_id, resource_type, operation_name
  FROM expanded_resources
  WHERE resource_type IS NOT NULL
    AND resource_type <> ''
    AND operation_name IN (
      'read', 'vread', 'create', 'update', 'patch',
      'delete', 'search-type', 'history-instance'
    )
),
operation_counts AS (
  SELECT
    resource_type,
    operation_name,
    COUNT(DISTINCT endpoint_id) AS endpoint_count
  FROM endpoint_ops
  GROUP BY resource_type, operation_name
)
SELECT
  oc.resource_type,
  oc.operation_name AS operation,
  oc.endpoint_count,
  ROUND(oc.endpoint_count * 100.0 / NULLIF(t.indexed_endpoints, 0), 1) AS support_percent
FROM operation_counts oc
CROSS JOIN mv_endpoint_totals t
ORDER BY oc.resource_type, oc.operation_name;

CREATE UNIQUE INDEX mv_resource_operation_support_uniq
  ON mv_resource_operation_support(resource_type, operation);
CREATE INDEX mv_resource_operation_support_resource_idx
  ON mv_resource_operation_support(resource_type);
CREATE INDEX mv_resource_operation_support_op_idx
  ON mv_resource_operation_support(operation);
