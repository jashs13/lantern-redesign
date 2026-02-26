# Lantern Frontend Migration Plan: Shiny to React

## Overview

This plan migrates the Lantern Shiny dashboard and R Plumber API to a React SPA with a Go API layer, while keeping all existing Go backend services (endpoint manager, capability querier, capability receiver) and PostgreSQL database untouched.

### Target Architecture

```
                                 UNCHANGED
                    ┌──────────────────────────────────┐
                    │  Endpoint Manager (Go)            │
                    │  Capability Querier (Go)          │
                    │  Capability Receiver (Go)         │
                    │  RabbitMQ                         │
                    │  PostgreSQL 15+                   │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │  NEW: Go API Server               │
           NEW      │  (replaces R Plumber)             │
                    │  /api/v1/*                        │
                    │  Port 8080                        │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │  NEW: React SPA                   │
           NEW      │  (replaces Shiny dashboard)       │
                    │  TypeScript + Vite                │
                    │  Port 3000 (dev) / static (prod)  │
                    └──────────────────────────────────┘
```

### Why a Go API Layer (Not Plumber)

The current R Plumber API has 2 endpoints. The Shiny dashboard queries PostgreSQL directly (no API). For React, we need a proper API server. Go is the right choice because:

- The project already has Go expertise and infrastructure
- Go's `database/sql` with `lib/pq` is already used in the codebase
- Single binary deployment, trivially containerized
- Excellent performance for JSON serialization
- Avoids introducing a third language (Python/Node)

---

## Phase 0: Prerequisites (Week 1)

Before writing any React code, fix the critical issues that affect the new stack too.

### 0.1 Upgrade PostgreSQL to 15+

The current PostgreSQL 11.10 is EOL. This must happen before building new code against it.

**Tasks:**
- Update `docker-compose.yml`: change `postgres:11.10` to `postgres:15`
- Test all migrations run cleanly against PostgreSQL 15
- Verify materialized view concurrent refresh works (behavior unchanged in 15)
- Update `synchronous_commit` to `local` (currently `off` — data loss risk)
- Run full test suite: `make test`, `make test_int`, `make test_e2e`

### 0.2 Fix SQL Injection in Existing Shiny Code

Even during migration, the Shiny dashboard will run in parallel. Fix `shinydashboard/lantern/functions/endpoints.R` line 33 and similar `paste0()` SQL patterns.

### 0.3 Remove Credentials from Docker Image Layers

Fix `api/Dockerfile` — stop baking `LANTERN_DBPASSWORD` into build args. Use runtime environment variables or Docker secrets.

### 0.4 Add Full-Text Search Indexes (Migration 000073)

The new design's search-first landing page requires fast cross-entity search. PostgreSQL's built-in full-text search (`tsvector` + GIN indexes) provides relevance ranking, word stemming, and prefix matching with zero new infrastructure.

**Key design decision — search vectors on materialized views, not base tables:**

The React frontend queries materialized views (`fhir_endpoint_comb_mv`, `mv_organizations_final`), not base tables. Putting `tsvector` columns on base tables would force an unnecessary JOIN back to the base table at query time, defeating the purpose of materialized views. Instead:

- **Endpoints and Organizations**: Add `search_vector` as a **computed column inside the materialized view definition**. The `to_tsvector(...)` is calculated when the MV refreshes. Create a GIN index on the MV. No triggers needed — the existing daily MV refresh keeps search vectors current.
- **Vendors**: Keep `tsvector` + trigger on the base `vendors` table. There is no vendors materialized view, and the table is small (hundreds of rows). Direct queries with a GIN index are fast.

**Create migration file:** `db/migration/migrations/000073_add_full_text_search.up.sql`

```sql
BEGIN;

-- =============================================================
-- 1. ENDPOINTS: Add search_vector to fhir_endpoint_comb_mv
--
-- fhir_endpoint_comb_mv already has url, vendor_name, fhir_version,
-- endpoint_names as denormalized text — perfect for to_tsvector().
-- We recreate the MV with an additional computed column.
-- =============================================================

-- Drop dependent MV first (selected_fhir_endpoints_mv depends on fhir_endpoint_comb_mv)
DROP MATERIALIZED VIEW IF EXISTS selected_fhir_endpoints_mv;
DROP MATERIALIZED VIEW IF EXISTS fhir_endpoint_comb_mv;

CREATE MATERIALIZED VIEW fhir_endpoint_comb_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    t.url,
    t.endpoint_names,
    t.info_created,
    t.info_updated,
    t.list_source,
    t.vendor_name,
    t.capability_fhir_version,
    t.fhir_version,
    t.format,
    t.http_response,
    t.response_time_seconds,
    t.smart_http_response,
    t.errors,
    t.availability,
    t.kind,
    t.requested_fhir_version,
    t.is_chpl,
    t.status,
    t.cap_stat_exists,
    -- NEW: computed search vector for full-text search
    to_tsvector('simple',
        coalesce(t.url, '') || ' ' ||
        coalesce(t.vendor_name, '') || ' ' ||
        coalesce(t.endpoint_names, '') || ' ' ||
        coalesce(t.fhir_version, '') || ' ' ||
        coalesce(t.list_source, '')
    ) AS search_vector
FROM (
    SELECT DISTINCT ON (e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version)
        e.url,
        e.endpoint_names,
        e.info_created,
        e.info_updated,
        e.list_source,
        e.vendor_name,
        e.capability_fhir_version,
        e.fhir_version,
        e.format,
        e.http_response,
        e.response_time_seconds,
        e.smart_http_response,
        e.errors,
        e.availability,
        e.kind,
        e.requested_fhir_version,
        lsi.is_chpl,
        CASE
            WHEN e.http_response = 200 THEN CONCAT('Success: ', e.http_response, ' - ', r.code_label)
            WHEN e.http_response IS NULL OR e.http_response = 0 THEN 'Failure: 0 - NA'
            ELSE CONCAT('Failure: ', e.http_response, ' - ', r.code_label)
        END AS status,
        LOWER(CASE
            WHEN e.kind != 'instance' THEN 'true*'::TEXT
            ELSE e.cap_stat_exists::TEXT
        END) AS cap_stat_exists
    FROM endpoint_export_mv e
    LEFT JOIN mv_http_responses r ON e.http_response = r.http_code
    LEFT JOIN list_source_info lsi ON e.list_source = lsi.list_source
    ORDER BY e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version
) t;

-- Recreate existing indexes
CREATE UNIQUE INDEX fhir_endpoint_comb_mv_unique_idx ON fhir_endpoint_comb_mv (id, url, list_source);

-- NEW: GIN index for full-text search
CREATE INDEX idx_fhir_endpoint_comb_mv_search ON fhir_endpoint_comb_mv USING GIN(search_vector);

-- Recreate selected_fhir_endpoints_mv (depends on fhir_endpoint_comb_mv)
-- NOTE: This view contains Shiny-specific HTML. The React app will query
-- fhir_endpoint_comb_mv directly, but we keep this for backward compatibility
-- during the parallel run period.
CREATE MATERIALIZED VIEW selected_fhir_endpoints_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    e.url,
    e.endpoint_names,
    e.info_created,
    e.info_updated,
    e.list_source,
    e.vendor_name,
    e.capability_fhir_version,
    e.fhir_version,
    e.format,
    e.http_response,
    e.response_time_seconds,
    e.smart_http_response,
    e.errors,
    e.availability * 100 AS availability,
    e.kind,
    e.requested_fhir_version,
    lsi.is_chpl,
    e.status,
    e.cap_stat_exists,
    CONCAT('<a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing additional information for this endpoint."
            onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
            onclick="Shiny.setInputValue(''endpoint_popup'',''', e.url, '&&', e.requested_fhir_version, ''',{priority: ''event''});">', e.url, '</a>')
    AS "urlModal",
    CASE
        WHEN e.endpoint_names IS NOT NULL
             AND array_length(string_to_array(e.endpoint_names, ';'), 1) > 5
        THEN CONCAT(
            array_to_string(ARRAY(SELECT unnest(string_to_array(e.endpoint_names, ';')) LIMIT 5), '; '),
            '; <a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing the endpoint''s entire list of API information source names."
                onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
                onclick="Shiny.setInputValue(''show_details'',''', e.url, ''',{priority: ''event''});"> Click For More... </a>'
        )
        ELSE e.endpoint_names
    END AS condensed_endpoint_names
FROM fhir_endpoint_comb_mv e
LEFT JOIN list_source_info lsi
    ON e.list_source = lsi.list_source;

-- Recreate selected_fhir_endpoints_mv indexes
CREATE UNIQUE INDEX idx_selected_fhir_endpoints_mv_unique ON selected_fhir_endpoints_mv(id, url, requested_fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_fhir_version ON selected_fhir_endpoints_mv(fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_vendor_name ON selected_fhir_endpoints_mv(vendor_name);
CREATE INDEX idx_selected_fhir_endpoints_mv_availability ON selected_fhir_endpoints_mv(availability);
CREATE INDEX idx_selected_fhir_endpoints_mv_is_chpl ON selected_fhir_endpoints_mv(is_chpl);


-- =============================================================
-- 2. ORGANIZATIONS: Add search_vector to mv_organizations_final
--
-- mv_organizations_final already has organization_name,
-- vendor_names_csv, addresses_csv — all searchable text.
-- =============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_organizations_final;

CREATE MATERIALIZED VIEW mv_organizations_final AS
SELECT
    ROW_NUMBER() OVER (ORDER BY organization_name) as org_id,
    organization_name,
    identifier_types_html,
    identifier_values_html,
    addresses_html,
    org_urls_html,
    string_agg(DISTINCT endpoint_urls_html, '<br/>') as endpoint_urls_html,
    fhir_versions_html,
    vendor_names_html,
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    string_agg(DISTINCT endpoint_urls_csv, E'\n') as endpoint_urls_csv,
    fhir_versions_csv,
    vendor_names_csv,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(fhir_versions_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as fhir_versions_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(vendor_names_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as vendor_names_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(urls_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as urls_array,
    -- NEW: computed search vector for full-text search
    to_tsvector('simple',
        coalesce(organization_name, '') || ' ' ||
        coalesce(vendor_names_csv, '') || ' ' ||
        coalesce(addresses_csv, '') || ' ' ||
        coalesce(identifier_values_csv, '')
    ) AS search_vector
FROM mv_organizations_aggregated
GROUP BY
    organization_name,
    identifier_types_html,
    identifier_values_html,
    addresses_html,
    org_urls_html,
    fhir_versions_html,
    vendor_names_html,
    identifier_types_csv,
    identifier_values_csv,
    addresses_csv,
    org_urls_csv,
    fhir_versions_csv,
    vendor_names_csv
ORDER BY organization_name;

-- Recreate existing indexes
CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);
CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);
CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);
CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);
CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);

-- NEW: GIN index for full-text search
CREATE INDEX idx_mv_orgs_final_search ON mv_organizations_final USING GIN(search_vector);


-- =============================================================
-- 3. VENDORS: search_vector on base table (no MV exists, small table)
-- =============================================================

ALTER TABLE vendors ADD COLUMN search_vector tsvector;

UPDATE vendors
SET search_vector = to_tsvector('simple',
    coalesce(name, '') || ' ' ||
    coalesce(developer_code, '')
);

CREATE INDEX idx_vendors_search ON vendors USING GIN(search_vector);

-- Trigger to auto-update on INSERT or UPDATE (base table, so triggers work)
CREATE OR REPLACE FUNCTION vendors_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple',
        coalesce(NEW.name, '') || ' ' ||
        coalesce(NEW.developer_code, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendors_search
    BEFORE INSERT OR UPDATE OF name, developer_code
    ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION vendors_search_trigger();

COMMIT;
```

**Create rollback file:** `db/migration/migrations/000073_add_full_text_search.down.sql`

```sql
BEGIN;

-- =============================================================
-- 1. Recreate fhir_endpoint_comb_mv WITHOUT search_vector
-- =============================================================

DROP MATERIALIZED VIEW IF EXISTS selected_fhir_endpoints_mv;
DROP MATERIALIZED VIEW IF EXISTS fhir_endpoint_comb_mv;

CREATE MATERIALIZED VIEW fhir_endpoint_comb_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    t.url, t.endpoint_names, t.info_created, t.info_updated,
    t.list_source, t.vendor_name, t.capability_fhir_version,
    t.fhir_version, t.format, t.http_response, t.response_time_seconds,
    t.smart_http_response, t.errors, t.availability, t.kind,
    t.requested_fhir_version, t.is_chpl, t.status, t.cap_stat_exists
FROM (
    SELECT DISTINCT ON (e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version)
        e.url, e.endpoint_names, e.info_created, e.info_updated,
        e.list_source, e.vendor_name, e.capability_fhir_version,
        e.fhir_version, e.format, e.http_response, e.response_time_seconds,
        e.smart_http_response, e.errors, e.availability, e.kind,
        e.requested_fhir_version, lsi.is_chpl,
        CASE
            WHEN e.http_response = 200 THEN CONCAT('Success: ', e.http_response, ' - ', r.code_label)
            WHEN e.http_response IS NULL OR e.http_response = 0 THEN 'Failure: 0 - NA'
            ELSE CONCAT('Failure: ', e.http_response, ' - ', r.code_label)
        END AS status,
        LOWER(CASE
            WHEN e.kind != 'instance' THEN 'true*'::TEXT
            ELSE e.cap_stat_exists::TEXT
        END) AS cap_stat_exists
    FROM endpoint_export_mv e
    LEFT JOIN mv_http_responses r ON e.http_response = r.http_code
    LEFT JOIN list_source_info lsi ON e.list_source = lsi.list_source
    ORDER BY e.url, e.vendor_name, e.fhir_version, e.http_response, e.requested_fhir_version
) t;

CREATE UNIQUE INDEX fhir_endpoint_comb_mv_unique_idx ON fhir_endpoint_comb_mv (id, url, list_source);

-- Recreate selected_fhir_endpoints_mv (original definition)
CREATE MATERIALIZED VIEW selected_fhir_endpoints_mv AS
SELECT
    ROW_NUMBER() OVER () AS id,
    e.url, e.endpoint_names, e.info_created, e.info_updated,
    e.list_source, e.vendor_name, e.capability_fhir_version,
    e.fhir_version, e.format, e.http_response, e.response_time_seconds,
    e.smart_http_response, e.errors, e.availability * 100 AS availability,
    e.kind, e.requested_fhir_version, lsi.is_chpl, e.status,
    e.cap_stat_exists,
    CONCAT('<a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing additional information for this endpoint."
            onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
            onclick="Shiny.setInputValue(''endpoint_popup'',''', e.url, '&&', e.requested_fhir_version, ''',{priority: ''event''});">', e.url, '</a>')
    AS "urlModal",
    CASE
        WHEN e.endpoint_names IS NOT NULL
             AND array_length(string_to_array(e.endpoint_names, ';'), 1) > 5
        THEN CONCAT(
            array_to_string(ARRAY(SELECT unnest(string_to_array(e.endpoint_names, ';')) LIMIT 5), '; '),
            '; <a class="lantern-url" tabindex="0" aria-label="Press enter to open a pop-up modal containing the endpoint''s entire list of API information source names."
                onkeydown="javascript:(function(event) { if (event.keyCode === 13){event.target.click()}})(event)"
                onclick="Shiny.setInputValue(''show_details'',''', e.url, ''',{priority: ''event''});"> Click For More... </a>'
        )
        ELSE e.endpoint_names
    END AS condensed_endpoint_names
FROM fhir_endpoint_comb_mv e
LEFT JOIN list_source_info lsi ON e.list_source = lsi.list_source;

CREATE UNIQUE INDEX idx_selected_fhir_endpoints_mv_unique ON selected_fhir_endpoints_mv(id, url, requested_fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_fhir_version ON selected_fhir_endpoints_mv(fhir_version);
CREATE INDEX idx_selected_fhir_endpoints_mv_vendor_name ON selected_fhir_endpoints_mv(vendor_name);
CREATE INDEX idx_selected_fhir_endpoints_mv_availability ON selected_fhir_endpoints_mv(availability);
CREATE INDEX idx_selected_fhir_endpoints_mv_is_chpl ON selected_fhir_endpoints_mv(is_chpl);

-- =============================================================
-- 2. Recreate mv_organizations_final WITHOUT search_vector
-- =============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_organizations_final;

CREATE MATERIALIZED VIEW mv_organizations_final AS
SELECT
    ROW_NUMBER() OVER (ORDER BY organization_name) as org_id,
    organization_name,
    identifier_types_html, identifier_values_html, addresses_html,
    org_urls_html,
    string_agg(DISTINCT endpoint_urls_html, '<br/>') as endpoint_urls_html,
    fhir_versions_html, vendor_names_html,
    identifier_types_csv, identifier_values_csv, addresses_csv,
    org_urls_csv,
    string_agg(DISTINCT endpoint_urls_csv, E'\n') as endpoint_urls_csv,
    fhir_versions_csv, vendor_names_csv,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(fhir_versions_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as fhir_versions_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(vendor_names_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as vendor_names_array,
    ARRAY(SELECT DISTINCT elem FROM unnest(string_to_array(string_agg(array_to_string(urls_array, '||||'), '||||'), '||||')) AS elem ORDER BY elem) as urls_array
FROM mv_organizations_aggregated
GROUP BY
    organization_name, identifier_types_html, identifier_values_html,
    addresses_html, org_urls_html, fhir_versions_html, vendor_names_html,
    identifier_types_csv, identifier_values_csv, addresses_csv,
    org_urls_csv, fhir_versions_csv, vendor_names_csv
ORDER BY organization_name;

CREATE UNIQUE INDEX idx_mv_orgs_final_org_id ON mv_organizations_final(org_id);
CREATE INDEX idx_mv_orgs_final_name ON mv_organizations_final(organization_name);
CREATE INDEX idx_mv_orgs_final_fhir_versions ON mv_organizations_final USING GIN(fhir_versions_array);
CREATE INDEX idx_mv_orgs_final_vendor_names ON mv_organizations_final USING GIN(vendor_names_array);
CREATE INDEX idx_mv_orgs_final_urls ON mv_organizations_final USING GIN(urls_array);

-- =============================================================
-- 3. Remove vendors search_vector
-- =============================================================

DROP TRIGGER IF EXISTS trg_vendors_search ON vendors;
DROP FUNCTION IF EXISTS vendors_search_trigger();
DROP INDEX IF EXISTS idx_vendors_search;
ALTER TABLE vendors DROP COLUMN IF EXISTS search_vector;

COMMIT;
```

**Design decisions:**

- **Search vectors on materialized views, not base tables** — the frontend queries MVs, so search must live there. This avoids JOINing back to base tables at query time. The `to_tsvector()` is computed when the MV refreshes, adding negligible overhead to the existing refresh cycle.
- **Vendors remain on the base table** — no vendor MV exists, and the table has only hundreds of rows. A trigger keeps the vector current on every INSERT/UPDATE.
- **`'simple'` text search configuration** instead of `'english'` — organization names, URLs, and NPI numbers are proper nouns and identifiers, not English prose. The `simple` config avoids stemming "Mayo" into "may" or stripping stop words from names like "The Johns Hopkins Hospital".
- **Endpoint search vector includes `url`, `vendor_name`, `endpoint_names`, `fhir_version`, and `list_source`** — all columns already present in `fhir_endpoint_comb_mv`, no additional JOINs needed.
- **Organization search vector includes `organization_name`, `vendor_names_csv`, `addresses_csv`, and `identifier_values_csv`** — so searching "Rochester" or "Mayo" or an NPI number all work directly on the MV.
- **`selected_fhir_endpoints_mv` is recreated for backward compatibility** — it contains Shiny-specific HTML (`onclick="Shiny.setInputValue(...)"`). The React app queries `fhir_endpoint_comb_mv` directly. After the Shiny decommission, `selected_fhir_endpoints_mv` can be dropped entirely.
- **No impact on existing code** — the `search_vector` column is additive to the MVs. Existing Go services and the Shiny dashboard don't SELECT it. Only the new Go API will use it.
- **Fully reversible** — the down migration recreates both MVs with their original definitions and all original indexes.

---

## Phase 1: Go API Server (Weeks 2–4)

Build the API that the React frontend will consume. This replaces both the R Plumber API and the Shiny app's direct database access.

### 1.1 Project Structure

```
api/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Viper-based config (reuse pattern from endpointmanager)
│   ├── database/
│   │   ├── pool.go              # Connection pool setup (SetMaxOpenConns, etc.)
│   │   └── queries.go           # Raw SQL queries as constants
│   ├── handlers/
│   │   ├── search.go            # GET /api/v1/search (full-text search across all entities)
│   │   ├── dashboard.go         # GET /api/v1/dashboard/summary
│   │   ├── endpoints.go         # GET /api/v1/endpoints
│   │   ├── endpoint_details.go  # GET /api/v1/endpoints/:url/details
│   │   ├── organizations.go     # GET /api/v1/organizations
│   │   ├── resources.go         # GET /api/v1/resources
│   │   ├── fields.go            # GET /api/v1/fields, /api/v1/field-values
│   │   ├── profiles.go          # GET /api/v1/profiles
│   │   ├── validations.go       # GET /api/v1/validations
│   │   ├── security.go          # GET /api/v1/security
│   │   ├── smart.go             # GET /api/v1/smart-response
│   │   ├── contacts.go          # GET /api/v1/contacts
│   │   ├── implementation.go    # GET /api/v1/implementation-guides
│   │   ├── downloads.go         # GET /api/v1/downloads/*
│   │   └── filters.go           # GET /api/v1/filters (vendor list, FHIR versions)
│   ├── middleware/
│   │   ├── cors.go              # CORS configuration
│   │   ├── logging.go           # Request logging
│   │   ├── ratelimit.go         # Rate limiting
│   │   └── cache.go             # Response caching (ETag / Cache-Control)
│   ├── models/
│   │   ├── search.go            # SearchResult, SearchResponse structs
│   │   ├── endpoint.go          # Endpoint structs
│   │   ├── organization.go      # Organization structs
│   │   ├── validation.go        # Validation structs
│   │   ├── security.go          # Security structs
│   │   ├── dashboard.go         # Dashboard summary structs
│   │   └── filters.go           # Filter option structs
│   └── router/
│       └── router.go            # Route registration
├── go.mod
├── go.sum
└── Dockerfile
```

### 1.2 API Endpoints

Every endpoint returns JSON. Pagination uses `?page=N&page_size=M` with a `total_count` field in the response envelope.

#### Standard Response Envelope

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total_count": 1523,
    "total_pages": 153
  },
  "filters_applied": {
    "fhir_versions": ["4.0.1"],
    "vendor": "Epic Systems Corporation"
  }
}
```

#### Endpoint Inventory

| Method | Path | Replaces | Source View/Table |
|--------|------|----------|-------------------|
| `GET` | `/api/v1/search` | New — landing page cross-entity search | `fhir_endpoints_info.search_vector`, `npi_organizations.search_vector`, `vendors.search_vector` (full-text search via `tsvector`) |
| `GET` | `/api/v1/dashboard/summary` | Dashboard tab totals, HTTP tallies, vendor counts | `mv_endpoint_totals`, `mv_response_tally`, `mv_vendor_fhir_counts` |
| `GET` | `/api/v1/endpoints` | Endpoints tab table | `selected_fhir_endpoints_mv` |
| `GET` | `/api/v1/endpoints/:url/details` | Endpoint detail modal (all 5 tabs) | `fhir_endpoints_info`, `fhir_endpoints_metadata`, capability_statement JSON, `endpoint_organization`, `healthit_products` |
| `GET` | `/api/v1/endpoints/:url/response-time` | Detail modal response time chart | `fhir_endpoints_info_history` (time-series) |
| `GET` | `/api/v1/endpoints/:url/http-history` | Detail modal HTTP response chart | `fhir_endpoints_info_history` (time-series) |
| `GET` | `/api/v1/organizations` | Organizations tab table | `mv_organizations_final` |
| `GET` | `/api/v1/resources` | Resources tab table | `mv_endpoint_resource_types` |
| `GET` | `/api/v1/resources/chart` | Resources tab bar chart data | `mv_endpoint_resource_types` (aggregated) |
| `GET` | `/api/v1/implementation-guides` | Implementation Guides tab chart | `mv_implementation_guide` |
| `GET` | `/api/v1/fields` | Fields tab (required + optional tables) | `mv_capstat_fields`, `mv_capstat_values_fields` |
| `GET` | `/api/v1/field-values` | Field Values tab table + chart | `mv_capstat_values` (filtered by field param) |
| `GET` | `/api/v1/profiles` | Profiles tab table | `mv_profiles_paginated` |
| `GET` | `/api/v1/capstat-sizes` | CapabilityStatement Size tab | `mv_capstat_sizes_tbl` |
| `GET` | `/api/v1/validations/summary` | Validations tab bar chart | `mv_validation_results_plot` |
| `GET` | `/api/v1/validations/details` | Validations tab left table | `mv_validation_details` |
| `GET` | `/api/v1/validations/failures` | Validations tab right table (paginated) | `mv_validation_failures` |
| `GET` | `/api/v1/security` | Security tab table | `security_endpoints_distinct_mv` |
| `GET` | `/api/v1/security/summary` | Security tab summary counts | `mv_endpoint_security_counts`, `mv_auth_type_count` |
| `GET` | `/api/v1/smart-response` | SMART Response tab table | `mv_well_known_endpoints` |
| `GET` | `/api/v1/smart-response/summary` | SMART Response summary tables | `mv_well_known_endpoints` (aggregated), `mv_smart_response_capabilities` |
| `GET` | `/api/v1/contacts` | Contacts tab table | `mv_contacts_info` |
| `GET` | `/api/v1/filters/vendors` | Vendor dropdown | `vendors` table (distinct names) |
| `GET` | `/api/v1/filters/fhir-versions` | FHIR version multi-select | `endpoint_export` (distinct versions) |
| `GET` | `/api/v1/filters/resources` | Resource type multi-select | `mv_endpoint_resource_types` (distinct types) |
| `GET` | `/api/v1/filters/auth-types` | Authorization type dropdown | `mv_auth_type_count` (distinct codes) |
| `GET` | `/api/v1/filters/profiles` | Profile dropdown | `endpoint_supported_profiles_mv` (distinct) |
| `GET` | `/api/v1/filters/validation-groups` | Validation group dropdown | Static JSON (`validation_groups.json`) |
| `GET` | `/api/v1/downloads/endpoints.csv` | CSV download (replaces Plumber `/daily/download`) | `endpoint_export` |
| `GET` | `/api/v1/downloads/organizations.csv` | CSV download (replaces Plumber `/organizations/v1`) | `mv_organizations_final` |

#### Common Query Parameters (applied server-side)

| Parameter | Type | Description | Applied To |
|-----------|------|-------------|------------|
| `q` | `string` | Full-text search query (supports prefix matching with `:*`, stemming, relevance ranking via `ts_rank`) | `/api/v1/search` (cross-entity), Endpoints, Organizations |
| `fhir_versions` | `string` (comma-separated) | Filter by FHIR version(s) | All endpoints except downloads |
| `vendor` | `string` | Filter by vendor/developer name | All endpoints except downloads |
| `search` | `string` | Simple ILIKE text search for per-page table filtering | Security, Contacts, Profiles, Resources, SMART |
| `page` | `int` (default 1) | Page number | All paginated endpoints |
| `page_size` | `int` (default 10) | Rows per page | All paginated endpoints |
| `availability` | `string` (enum) | Availability filter (0-100, 0, 50-100, 75-100, 95-100, 99-100, 100) | Endpoints only |
| `source` | `string` (enum) | CHPL, State Medicaid, Payer, Other, All | Endpoints only |
| `auth_type` | `string` | Authorization type code | Security only |
| `field` | `string` | Field name for values | Field Values only |
| `resource` | `string` | Resource type filter | Profiles, Resources |
| `operations` | `string` (comma-separated) | Operation types | Resources only |
| `has_contact` | `string` (enum) | true, false, any | Contacts only |
| `validation_group` | `string` | Validation group name | Validations only |
| `rule_name` | `string` | Selected validation rule | Validation failures only |
| `sort_by` | `string` | Column name to sort by | All paginated endpoints |
| `sort_dir` | `string` (asc/desc) | Sort direction | All paginated endpoints |

### 1.3 Implementation Details

**Router:** Use `chi` (lightweight, stdlib-compatible) or `gorilla/mux`. Avoid heavy frameworks.

**Database:**
```go
// internal/database/pool.go
func NewPool(cfg *config.Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.DatabaseURL())
    if err != nil {
        return nil, fmt.Errorf("opening database: %w", err)
    }
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(5 * time.Minute)
    return db, nil
}
```

**Queries:** Use prepared statements with parameterized inputs. All filtering done server-side with `WHERE` clause construction using `$1, $2, ...` placeholders — never string concatenation.

**Full-text search handler** (`handlers/search.go`):

The search endpoint powers the landing page search bar. It queries all three `search_vector` columns in parallel and returns a unified, relevance-ranked response.

```go
// GET /api/v1/search?q=mayo+clinic&type=all&limit=10
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query().Get("q")
    if q == "" {
        writeJSON(w, http.StatusOK, SearchResponse{})
        return
    }

    // Convert user input to tsquery — support prefix matching
    // "mayo clinic" → "mayo:* & clinic:*"
    tsQuery := buildTsQuery(q)

    // Query all three entity types in parallel
    var wg sync.WaitGroup
    var endpoints []SearchResult
    var orgs []SearchResult
    var vendors []SearchResult

    wg.Add(3)
    go func() {
        defer wg.Done()
        endpoints = h.searchEndpoints(r.Context(), tsQuery, limit)
    }()
    go func() {
        defer wg.Done()
        orgs = h.searchOrganizations(r.Context(), tsQuery, limit)
    }()
    go func() {
        defer wg.Done()
        vendors = h.searchVendors(r.Context(), tsQuery, limit)
    }()
    wg.Wait()

    // Merge results, interleave by rank
    // ...
}

// buildTsQuery converts "mayo clinic" to "mayo:* & clinic:*"
// Handles special characters and SQL injection safely
func buildTsQuery(input string) string {
    words := strings.Fields(sanitizeSearchInput(input))
    parts := make([]string, 0, len(words))
    for _, w := range words {
        parts = append(parts, w+":*")
    }
    return strings.Join(parts, " & ")
}
```

**SQL for each entity type — all queries hit MVs or small tables directly, no JOINs to base tables:**

```sql
-- Endpoints: query fhir_endpoint_comb_mv directly (search_vector is a column on the MV)
SELECT url, vendor_name, fhir_version, http_response, availability, status,
       ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
FROM fhir_endpoint_comb_mv
WHERE search_vector @@ to_tsquery('simple', $1)
ORDER BY rank DESC
LIMIT $2;

-- Organizations: query mv_organizations_final directly (search_vector is a column on the MV)
SELECT org_id, organization_name, addresses_csv, vendor_names_csv,
       ts_rank(search_vector, to_tsquery('simple', $1)) AS rank
FROM mv_organizations_final
WHERE search_vector @@ to_tsquery('simple', $1)
ORDER BY rank DESC
LIMIT $2;

-- Vendors: query base table directly (small table, trigger-maintained search_vector)
SELECT v.name, COUNT(DISTINCT ei.url) AS endpoint_count,
       ts_rank(v.search_vector, to_tsquery('simple', $1)) AS rank
FROM vendors v
LEFT JOIN fhir_endpoints_info ei ON v.id = ei.vendor_id
  AND ei.requested_fhir_version = 'None'
WHERE v.search_vector @@ to_tsquery('simple', $1)
GROUP BY v.id, v.name, v.search_vector
ORDER BY rank DESC
LIMIT $2;
```

**Full-text search for per-page filtering** (Endpoints, Organizations pages):

The Endpoints and Organizations list pages also use `tsvector` search when the `q` parameter is provided. Since the search vector lives directly on the MV, no JOINs are needed:

```sql
-- Endpoints page: GET /api/v1/endpoints?q=epic+systems
-- Queries fhir_endpoint_comb_mv directly — search_vector is a column on this MV
SELECT url, vendor_name, fhir_version, http_response, availability,
       endpoint_names, status, cap_stat_exists, response_time_seconds
FROM fhir_endpoint_comb_mv
WHERE search_vector @@ to_tsquery('simple', $1)
ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC
LIMIT $2 OFFSET $3;

-- Organizations page: GET /api/v1/organizations?q=mayo
-- Queries mv_organizations_final directly — search_vector is a column on this MV
SELECT org_id, organization_name, addresses_html, vendor_names_html,
       fhir_versions_html, endpoint_urls_html
FROM mv_organizations_final
WHERE search_vector @@ to_tsquery('simple', $1)
ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC
LIMIT $2 OFFSET $3;
```

Pages that have low row counts (Security, Contacts, Profiles, Resources, SMART) continue to use simple `ILIKE` search since their materialized views are small enough that full-text indexing adds no meaningful benefit.

**Caching middleware:** Add `Cache-Control: public, max-age=300` for list endpoints (data refreshes at 6 AM daily). Add `ETag` headers for conditional requests.

**CORS:** Allow the React dev server origin (`http://localhost:3000`) in development; restrict to production domain in prod.

**Rate limiting:** Token bucket per IP, 100 requests/minute for API, 10 requests/minute for CSV downloads.

### 1.4 Search Vector Maintenance

The search vectors require zero additional maintenance:

- **Endpoints and Organizations** (`fhir_endpoint_comb_mv`, `mv_organizations_final`): The `search_vector` is a **computed column** in the MV definition. It is recalculated every time the MV is refreshed. The existing `refresh_materialized_views.sh` script already refreshes these MVs — no modification needed. The GIN indexes are also updated automatically during `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

- **Vendors** (base table): A trigger maintains the `search_vector` on every INSERT/UPDATE of `name` or `developer_code`. Since the vendors table is small (hundreds of rows) and changes infrequently, this adds negligible overhead.

- **Search freshness** matches data freshness: since the search vectors live on the same MVs the frontend queries, search results are always exactly as fresh as the displayed data. There is no "search index lag" scenario.

- **No new cron jobs, no sync pipelines, no additional infrastructure.**

### 1.5 Testing

- Unit tests for each handler (mock database with `sqlmock`)
- Integration tests against test database (follow existing `// +build integration` pattern)
- Test each query parameter combination
- Test pagination edge cases (page 0, page beyond max, negative page_size)
- Test CSV download output matches current Plumber output
- **Search-specific tests:**
  - Test prefix matching: "may" finds "Mayo Clinic"
  - Test multi-word queries: "mayo clinic" finds "Mayo Clinic" (AND semantics)
  - Test cross-entity results: searching "Epic" returns both the vendor and their endpoints
  - Test empty query returns empty result (not error)
  - Test special characters are sanitized (no SQL injection via search input)
  - Test relevance ranking: exact match ranks higher than partial match
  - Test limit parameter caps results per entity type

### 1.6 Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /
EXPOSE 8080
USER nonroot:nonroot
CMD ["/server"]
```

### 1.7 Docker Compose Integration

Add to `docker-compose.yml`:

```yaml
lantern-api:
  build:
    context: ./api
  ports:
    - "8080:8080"
  environment:
    - LANTERN_DBHOST=${LANTERN_DBHOST}
    - LANTERN_DBPORT=${LANTERN_DBPORT}
    - LANTERN_DBNAME=${LANTERN_DBNAME}
    - LANTERN_DBUSER_READONLY=${LANTERN_DBUSER_READONLY}
    - LANTERN_DBPASSWORD_READONLY=${LANTERN_DBPASSWORD_READONLY}
  depends_on:
    postgres:
      condition: service_healthy
  restart: on-failure:5
  healthcheck:
    test: ["CMD", "/server", "-health"]
    interval: 10s
    timeout: 3s
    retries: 3
```

Note: The API connects with the **read-only** database user — it never writes.

---

## Phase 2: React Application Scaffold (Weeks 3–4)

Begin React setup in parallel with API development (API can be mocked initially).

### 2.1 Project Structure

```
frontend/
├── public/
│   ├── favicon.webp
│   └── favicon.png
├── src/
│   ├── api/
│   │   ├── client.ts            # Axios/fetch wrapper with base URL, error handling
│   │   ├── endpoints.ts         # Typed API functions: fetchEndpoints(), fetchDashboard(), etc.
│   │   └── types.ts             # API response types (generated or hand-written)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Sidebar + header + content area
│   │   │   ├── Sidebar.tsx      # Navigation menu (15 items)
│   │   │   └── Header.tsx       # Title, version, GitHub link, dev banner
│   │   ├── ui/
│   │   │   ├── DataTable.tsx    # Reusable paginated table (wraps TanStack Table)
│   │   │   ├── Pagination.tsx   # Prev/Next + page input + "of X"
│   │   │   ├── FilterBar.tsx    # Global filter container
│   │   │   ├── SearchInput.tsx  # Debounced text search
│   │   │   ├── MultiSelect.tsx  # FHIR version multi-select
│   │   │   ├── Select.tsx       # Single-select dropdown
│   │   │   ├── InfoBox.tsx      # Dashboard metric boxes
│   │   │   ├── Modal.tsx        # Reusable modal (replaces Shiny modals)
│   │   │   ├── LoadingState.tsx # Skeleton/spinner for loading
│   │   │   ├── EmptyState.tsx   # "No data" placeholder
│   │   │   ├── DownloadButton.tsx # CSV download trigger
│   │   │   └── BarChart.tsx     # Reusable bar chart (wraps Recharts)
│   │   └── charts/
│   │       ├── StackedBarChart.tsx    # Vendor/FHIR version chart
│   │       ├── BoxPlot.tsx            # CapStat size chart
│   │       ├── TimeSeriesChart.tsx    # Response time / HTTP history
│   │       └── ResourceBarChart.tsx   # Resource type chart
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx      # Dashboard tab
│   │   │   ├── EndpointTotals.tsx     # Info boxes row
│   │   │   ├── VendorFhirTable.tsx    # Vendor x FHIR version table
│   │   │   ├── VendorFhirChart.tsx    # Stacked bar chart
│   │   │   └── HttpResponseSummary.tsx # HTTP response table + chart
│   │   ├── endpoints/
│   │   │   ├── EndpointsPage.tsx      # Endpoints tab
│   │   │   ├── EndpointTable.tsx      # Paginated endpoint table
│   │   │   └── EndpointDetailModal.tsx # 5-tab detail modal
│   │   │       ├── DetailsTab.tsx     # Response time, HTTP history, metrics
│   │   │       ├── OrganizationsTab.tsx
│   │   │       ├── CapabilitiesTab.tsx # Fields, Resources, SMART, JSON
│   │   │       ├── ImplementationTab.tsx # IGs + Profiles
│   │   │       └── ProductsTab.tsx    # CHPL products
│   │   ├── organizations/
│   │   │   ├── OrganizationsPage.tsx
│   │   │   └── OrganizationTable.tsx  # Grouped table
│   │   ├── resources/
│   │   │   ├── ResourcesPage.tsx      # Tab panel (Chart | Table)
│   │   │   ├── ResourceTable.tsx
│   │   │   ├── ResourceChart.tsx
│   │   │   └── ResourceOperationFilter.tsx # Checkbox multi-select
│   │   ├── implementation-guides/
│   │   │   └── ImplementationGuidesPage.tsx
│   │   ├── fields/
│   │   │   ├── FieldsPage.tsx         # Required + Optional tables
│   │   │   └── FieldValuesPage.tsx    # Field selector + table + chart
│   │   ├── profiles/
│   │   │   └── ProfilesPage.tsx
│   │   ├── capstat-size/
│   │   │   └── CapStatSizePage.tsx    # Box plot + statistics table
│   │   ├── validations/
│   │   │   ├── ValidationsPage.tsx    # Chart + two-panel layout
│   │   │   ├── ValidationChart.tsx
│   │   │   ├── ValidationDetailsTable.tsx
│   │   │   └── ValidationFailuresTable.tsx
│   │   ├── security/
│   │   │   ├── SecurityPage.tsx
│   │   │   └── SecurityTable.tsx
│   │   ├── smart-response/
│   │   │   ├── SmartResponsePage.tsx
│   │   │   ├── WellKnownSummary.tsx
│   │   │   └── SmartCapabilitiesTable.tsx
│   │   ├── contacts/
│   │   │   ├── ContactsPage.tsx
│   │   │   └── ContactDetailModal.tsx
│   │   ├── downloads/
│   │   │   └── DownloadsPage.tsx      # Download buttons + API docs
│   │   └── about/
│   │       └── AboutPage.tsx          # Static content
│   ├── hooks/
│   │   ├── useFilters.ts             # Global filter state (context + URL params)
│   │   ├── usePagination.ts          # Page state management
│   │   ├── useDebounce.ts            # Search input debouncing
│   │   └── useCsvDownload.ts         # Download trigger + progress
│   ├── context/
│   │   └── FilterContext.tsx          # Global filter provider (FHIR versions, vendor)
│   ├── lib/
│   │   ├── formatters.ts             # Number formatting, date formatting
│   │   ├── constants.ts              # FHIR version groups, page sizes, etc.
│   │   └── url.ts                    # URL param sync utilities
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                     # Tailwind imports + custom styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── Dockerfile
```

### 2.2 Technology Choices

| Need | Library | Rationale |
|------|---------|-----------|
| Build tool | **Vite** | Fast HMR, native TypeScript, simple config |
| Language | **TypeScript** (strict mode) | Type safety across API responses and components |
| Routing | **React Router v6** | Standard SPA routing, URL param support |
| Data fetching | **TanStack Query v5** | Server state caching, background refetch, pagination, loading/error states |
| Tables | **TanStack Table v8** | Headless — full control over markup and styling, sorting, pagination, grouping |
| Charts | **Recharts** | Declarative, React-native, covers bar/stacked/box/line charts |
| Styling | **Tailwind CSS** | Utility-first, small bundle, consistent spacing/colors |
| Component primitives | **Radix UI** | Unstyled, accessible modals, dropdowns, tabs, selects |
| Icons | **Lucide React** | Lightweight, tree-shakeable (replaces Font Awesome) |
| Date formatting | **date-fns** | Tree-shakeable, no moment.js bloat |
| HTTP client | **Native fetch** (wrapped) | No extra dependency; TanStack Query handles retries/caching |
| Testing | **Vitest + React Testing Library** | Vite-native, fast, widely adopted |
| E2E testing | **Playwright** | Cross-browser, reliable, good DX |
| Linting | **ESLint + typescript-eslint** | Standard for TypeScript React |
| Formatting | **Prettier** | Opinionated formatting, no debates |

### 2.3 Key Design Decisions

#### Global Filter State

The current Shiny app has global filters (FHIR version, vendor) that affect every tab. Implement this as a React context + URL query parameter sync:

```typescript
// src/context/FilterContext.tsx
interface FilterState {
  fhirVersions: string[];    // Multi-select
  vendor: string | null;      // Single-select, null = "All Developers"
}

// Sync to URL: ?fhir_versions=4.0.1,3.0.2&vendor=Epic
// Every page reads from context
// Changing a filter resets pagination to page 1 on all tabs
```

#### Server-Side Pagination and Filtering

All filtering and pagination happens on the API server, not in the browser. The React app sends query parameters; the API returns a page of results plus `total_count`. This matches the current Shiny behavior (which queries materialized views with LIMIT/OFFSET) and avoids transferring large datasets to the browser.

```typescript
// src/api/endpoints.ts
export async function fetchEndpoints(params: EndpointQueryParams) {
  const response = await apiClient.get('/api/v1/endpoints', { params });
  return response as PaginatedResponse<Endpoint>;
}

// Used in component via TanStack Query:
const { data, isLoading } = useQuery({
  queryKey: ['endpoints', filters, page, search],
  queryFn: () => fetchEndpoints({ ...filters, page, search }),
  placeholderData: keepPreviousData,  // Show stale data while loading new page
});
```

#### Tab-Specific Filters

Some tabs have additional filters (availability, source, auth type, etc.). These are managed as local state within the page component, not global context. They are still synced to URL params so links are shareable.

#### Data Refresh Strategy

The current Shiny app refreshes all data daily at 6 AM. In React:
- TanStack Query's `staleTime: 5 * 60 * 1000` (5 minutes) prevents excessive refetching during navigation
- `refetchOnWindowFocus: false` — don't refetch when user switches tabs
- API sets `Cache-Control: public, max-age=300` for list endpoints
- No need for a timer-based refresh in the frontend — the API cache handles staleness

---

## Phase 3: Core Page Implementation (Weeks 4–8)

Build pages in priority order. Each page follows the same pattern: fetch data via TanStack Query, render with TanStack Table/Recharts, wire up filters.

### 3.1 Sprint 1 — Foundation + Dashboard (Week 4–5)

**Deliverables:**
- App shell: sidebar navigation, header, routing for all 15 tabs
- `FilterContext` with FHIR version multi-select and vendor dropdown
- `DataTable` component wrapping TanStack Table (pagination, sorting, search)
- `Pagination` component matching current UX (Prev/Next + page input + "of X")
- **Dashboard page**: 3 info boxes, 3 value boxes, vendor/FHIR table, stacked bar chart, HTTP response table + chart

**Acceptance criteria:**
- Dashboard displays same numbers as current Shiny dashboard
- FHIR version filter and vendor dropdown update all dashboard data
- URL reflects current tab: `/#/dashboard`, `/#/endpoints`, etc.

### 3.2 Sprint 2 — Endpoints + Endpoint Detail Modal (Week 5–6)

**Deliverables:**
- **Endpoints page**: paginated table with 8 columns (URL, API Info Source Name, Developer, FHIR Version, Supported Formats, Cap Statement Returned, HTTP Response, Availability)
- Tab-specific filters: availability range, source (CHPL/Medicaid/Payer/Other/All)
- Text search across all visible columns
- CSV download button
- **Endpoint Detail Modal** with 5 tabbed panels:
  - Details: response time line chart (Recharts), HTTP response history chart, status metrics sidebar
  - Organizations: linked organization list
  - Capabilities: fields table, resources table, SMART capabilities, raw JSON viewer
  - Implementation Guides & Profiles: listing tables
  - Products: CHPL product matches

**Acceptance criteria:**
- Clicking a URL opens the detail modal with all 5 tabs populated
- Pagination, search, and filters work identically to current dashboard
- CSV export produces same columns and format as current download

### 3.3 Sprint 3 — Organizations + Resources + Implementation Guides (Week 6–7)

**Deliverables:**
- **Organizations page**: grouped table (by organization name), multi-value columns (identifiers, addresses, endpoints, FHIR versions, developers), search, CSV download
- **Resources page**: dual view (chart tab / table tab), resource checkbox multi-select (left/right columns), operation checkbox multi-select, 50 rows per page, bar chart with FHIR version fill
- **Implementation Guides page**: stacked bar chart by IG name

**Acceptance criteria:**
- Organizations table grouping matches current Shiny behavior
- Resources checkbox selection and chart update work correctly
- All three pages respond to global FHIR version and vendor filters

### 3.4 Sprint 4 — Fields + Field Values + Profiles + CapStat Size (Week 7–8)

**Deliverables:**
- **Fields page**: required vs optional field tables, field count bar charts, extension tables
- **Field Values page**: field selector dropdown, values table (paginated), endpoint count bar chart
- **Profiles page**: paginated table, resource + profile dropdowns, search
- **CapabilityStatement Size page**: box plot by developer/FHIR version, statistics table (count, min, max, mean, std dev)

**Acceptance criteria:**
- Fields page dynamically lists tracked fields and extensions
- Box plot renders correctly with statistical overlay

### 3.5 Sprint 5 — Validations + Security + SMART Response + Contacts (Week 8–9)

**Deliverables:**
- **Validations page**: stacked bar chart (success/failure), two-panel layout with rule details table (left, selectable rows) and failure details table (right, paginated by selected rule), validation group filter
- **Security page**: endpoint security summary, auth type count table, auth type dropdown, paginated security endpoints table
- **SMART Response page**: well-known URI summary tables (3), vendor summary, SMART capability count table, paginated endpoints table
- **Contacts page**: paginated contacts table, contact detail modal, has-contact filter

**Acceptance criteria:**
- Selecting a validation rule in the left table loads its failures in the right table
- Security auth type filter dynamically populates from database
- All four pages respond to global filters

### 3.6 Sprint 6 — Downloads + About + Polish (Week 9–10)

**Deliverables:**
- **Downloads page**: 4 CSV download buttons (endpoints, endpoint field descriptions, organizations, organization field descriptions), REST API documentation section with endpoint descriptions and parameter docs
- **About page**: static content (project description, version, links)
- **Release notes modal** accessible from header
- Accessibility audit: ARIA labels, keyboard navigation, focus management, screen reader testing
- Performance audit: bundle size analysis, lazy-loaded routes, image optimization
- Cross-browser testing: Chrome, Firefox, Safari, Edge
- Mobile responsive layout review

---

## Phase 4: Testing (Weeks 8–10, overlapping with Phase 3)

### 4.1 Unit Tests (Vitest + React Testing Library)

Write tests alongside each component. Target:
- All `api/*.ts` functions — mock fetch, verify request params and response parsing
- All `hooks/*.ts` — test filter state transitions, debounce behavior, pagination logic
- Each page component — verify renders loading state, data state, error state, empty state
- `DataTable` — sorting, pagination, search filtering
- `FilterContext` — multi-select add/remove, URL sync

### 4.2 Integration Tests (Vitest)

- Full page render with mocked API responses
- Filter changes trigger correct API calls with correct params
- Pagination navigates correctly
- CSV download triggers correct endpoint

### 4.3 E2E Tests (Playwright)

- Navigation between all 15 tabs
- Global filter changes affect all tabs
- Endpoint detail modal opens and displays all 5 sub-tabs
- CSV downloads produce valid files
- Search works on every searchable page
- Responsive layout at mobile/tablet/desktop breakpoints

### 4.4 API Tests

- Unit tests for every Go handler (sqlmock)
- Integration tests against test database (reuse existing `docker-compose.test.yml`)
- Verify response schema matches TypeScript types
- Load testing with `hey` or `k6` — target <200ms p95 for list endpoints

---

## Phase 5: Deployment + Cutover (Weeks 10–12)

### 5.1 Docker Setup

**Frontend Dockerfile:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
USER nginx
```

**nginx.conf:**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Go server
    location /api/ {
        proxy_pass http://lantern-api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5.2 Updated docker-compose.yml

```yaml
# Replace shinydashboard + plumber services with:
lantern-api:
  build:
    context: ./api
  environment:
    - LANTERN_DBHOST=${LANTERN_DBHOST}
    - LANTERN_DBPORT=${LANTERN_DBPORT}
    - LANTERN_DBNAME=${LANTERN_DBNAME}
    - LANTERN_DBUSER_READONLY=${LANTERN_DBUSER_READONLY}
    - LANTERN_DBPASSWORD_READONLY=${LANTERN_DBPASSWORD_READONLY}
  depends_on:
    postgres:
      condition: service_healthy
  restart: on-failure:5

lantern-frontend:
  build:
    context: ./frontend
  ports:
    - "8090:80"    # Same external port as current Shiny
  depends_on:
    - lantern-api
  restart: on-failure:5
```

### 5.3 Parallel Running Strategy

During weeks 10-11, run both dashboards simultaneously:

| Service | Port | Status |
|---------|------|--------|
| Shiny dashboard (current) | 8090 | Production |
| React dashboard (new) | 8091 | Staging |
| Plumber API (current) | 8989 | Production |
| Go API (new) | 8080 | Staging |

This allows side-by-side comparison of every page, table, and chart.

### 5.4 Cutover Checklist

Before switching:

- [ ] Every page matches current Shiny output (data parity verified)
- [ ] CSV downloads produce identical data
- [ ] All E2E tests pass
- [ ] API load test passes under expected traffic
- [ ] Accessibility audit complete (WCAG 2.1 AA)
- [ ] Mobile responsive layout verified
- [ ] Error states tested (API down, DB down, empty results)
- [ ] Monitoring/alerting set up for Go API (health endpoint, error rate)
- [ ] Redirect from port 8989 (old Plumber) to new API docs page
- [ ] Documentation updated (README, API docs)

### 5.5 Decommission Old Frontend

After 2 weeks of stable production on React:

- Remove `shinydashboard/` directory
- Remove `api/download/` (old Plumber API)
- Remove R-related Dockerfiles and renv.lock files
- Remove `rocker/shiny-verse` and `rstudio/plumber` from docker-compose
- Update CI/CD to remove R linting (`make lint_R`)
- Update Makefile targets

---

## Phase 6: Post-Migration Improvements (Week 12+)

Things that become easy with the new stack but are out of scope for initial migration:

1. **URL-based deep linking** — every filter combination produces a shareable URL (React Router + URL params)
2. **Dark mode** — Tailwind's `dark:` variant makes this trivial
3. **Keyboard shortcuts** — navigate tabs, open/close modals
4. **Real-time updates** — WebSocket from Go API when materialized views refresh
5. **Progressive Web App** — offline dashboard viewing with service worker caching
6. **OpenAPI spec auto-generation** — Go API generates OpenAPI 3.0 spec, React client auto-generated from spec
7. **Performance dashboards** — Lighthouse CI in GitHub Actions
8. **Feature flags** — environment-based feature toggling for staged rollouts

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Phase 0 | PostgreSQL upgrade, SQL injection fix, Docker credential fix |
| 2–3 | Phase 1 | Go API server — all endpoints, middleware, tests |
| 3–4 | Phase 2 | React scaffold — routing, filter context, DataTable, chart components |
| 4–5 | Phase 3.1 | Dashboard page (fully functional) |
| 5–6 | Phase 3.2 | Endpoints page + Endpoint Detail Modal (all 5 tabs) |
| 6–7 | Phase 3.3 | Organizations + Resources + Implementation Guides |
| 7–8 | Phase 3.4 | Fields + Field Values + Profiles + CapStat Size |
| 8–9 | Phase 3.5 | Validations + Security + SMART Response + Contacts |
| 9–10 | Phase 3.6 | Downloads + About + accessibility + polish |
| 8–10 | Phase 4 | Testing (unit, integration, E2E, API load) |
| 10–11 | Phase 5 | Parallel run, data parity verification |
| 11–12 | Phase 5 | Cutover, decommission Shiny, documentation |
| 12+ | Phase 6 | Post-migration enhancements |

**Total estimated duration: 12 weeks** for a 2-person team (1 frontend, 1 backend/fullstack).

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data parity — React shows different numbers than Shiny | Build a comparison tool that hits both APIs and diffs responses. Run nightly during parallel period. |
| Materialized view schema changes during migration | Freeze MV schema changes during Phases 2-5. Any DB changes go through the API layer. |
| Chart visual differences (ggplot2 vs Recharts) | Accept visual differences. Match data accuracy, not pixel-perfect rendering. |
| Performance regression (API slower than direct DB queries) | Set p95 latency targets per endpoint. Add database query timing logs. Use connection pooling and prepared statements. |
| Team unfamiliar with TanStack Query/Table | Allocate 2 days for spike/proof-of-concept before Phase 3. |
| PostgreSQL upgrade breaks queries | Run full test suite against PostgreSQL 15 in CI before merging the upgrade. |
| Scope creep — adding features during migration | Strict rule: migration only reproduces existing functionality. New features go in Phase 6. |
| Full-text search vector stale after vendor rename | Triggers maintain search vectors on row-level changes. Vendor name changes don't cascade to endpoint search vectors. Schedule weekly `UPDATE fhir_endpoints_info SET search_vector = ...` refresh if vendor renames are expected. Monitor search quality during parallel run. |
| Full-text search migration slow on large tables | The `UPDATE ... SET search_vector` in migration 000073 touches every row. On a database with 45,000+ endpoints and large org tables, this may take 1-5 minutes. Run during maintenance window. The migration is wrapped in a transaction and fully reversible. |
