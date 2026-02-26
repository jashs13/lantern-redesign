Here's a practical, step-by-step guide for executing this migration using Claude Code as your development partner.

---

## Step 1: Set Up Your Working Environment

Start by opening Claude Code in your project directory and establishing the baseline:

```bash
# Navigate to the project
cd /Users/srikanthaddala/Downloads/lanterncode/lantern-back-end-main

# Start Claude Code
claude
```

**First prompt to Claude Code:**

```
Read MIGRATION_PLAN.md and CLAUDE.md to understand the full project context
and migration plan. Summarize the current phase we need to start with
(Phase 0: Prerequisites).
```

This loads the entire plan into Claude Code's context so every subsequent prompt is grounded in the plan.

---

## Step 2: Phase 0 — Prerequisites (Critical Fixes)

### 2a: Fix SQL Injection

```
Fix the SQL injection vulnerability in shinydashboard/lantern/functions/endpoints.R.
The function at line 33 uses paste0() to concatenate user input directly into SQL.
Replace all paste0() SQL construction with glue_sql() parameterized queries.
Also check all other R files in shinydashboard/lantern/functions/ for similar patterns.
Do not change any behavior — only fix the injection vectors.
```

### 2b: Fix Docker Credential Leaks

```
Fix api/Dockerfile — it currently passes database credentials as ARG build arguments
and bakes them into the image with "RUN env | grep LANTERN > /home/plumber/.Renviron".
Rewrite it to use runtime environment variables instead of build args for all
LANTERN_DB* and LANTERN_Q* variables. The .Renviron file should be written at
container startup via an entrypoint script, not during build.
```

### 2c: Upgrade PostgreSQL

```
Update docker-compose.yml to change postgres:11.10 to postgres:15.
Also change the command from "-csynchronous_commit=off" to "-csynchronous_commit=local".
Add a healthcheck to the postgres service:
  test: pg_isready -U lantern
  interval: 10s, timeout: 5s, retries: 5
Do the same for docker-compose.test.yml.
Do not change any other services yet.
```

### 2d: Commit Phase 0

```
/commit
```

Use the `/commit` command to review and commit the prerequisite changes before starting the migration.

---

## Step 3: Phase 1 — Build the Go API Server

This is the foundation the React app will consume. Break it into focused prompts:

### 3a: Scaffold the API Project

```
Create a new Go API server under api/ following the structure from MIGRATION_PLAN.md
Phase 1.1. Create:
- api/cmd/server/main.go (entry point using chi router)
- api/go.mod (module github.com/onc-healthit/lantern-back-end/api, go 1.21)
- api/internal/config/config.go (viper-based, reading LANTERN_DB* env vars)
- api/internal/database/pool.go (sql.Open with SetMaxOpenConns=25, SetMaxIdleConns=10, SetConnMaxLifetime=5min)
- api/internal/router/router.go (register all route groups)
- api/internal/middleware/cors.go, logging.go, cache.go

Use the read-only database user (LANTERN_DBUSER_READONLY).
Use the chi router. Add a GET /health endpoint that checks DB connectivity.
The server should listen on port 8080.
Wire up graceful shutdown with os.Signal handling for SIGTERM/SIGINT.
```

### 3b: Define Response Models

```
Create api/internal/models/ with Go structs for all API response types.
Reference MIGRATION_PLAN.md Phase 1.2 for the full endpoint list. Key models:

- models/endpoint.go: Endpoint struct matching selected_fhir_endpoints_mv columns
  (url, vendor_name, fhir_version, format, http_response, availability,
  cap_stat_exists, list_source, endpoint_names)
- models/dashboard.go: DashboardSummary with EndpointTotals, ResponseTally,
  VendorFhirCounts
- models/organization.go: Organization matching mv_organizations_final columns
- models/pagination.go: PaginatedResponse[T] generic wrapper with Data, Pagination
  (Page, PageSize, TotalCount, TotalPages), FiltersApplied
- models/filters.go: FilterOptions for vendors, fhir_versions, resources

Use json struct tags for all fields. Use pointer types for nullable database columns.
```

### 3c: Build Handlers — Start with Dashboard + Endpoints

```
Create api/internal/handlers/dashboard.go implementing GET /api/v1/dashboard/summary.
It should query three materialized views:
1. mv_endpoint_totals — endpoint count totals
2. mv_response_tally — HTTP response code counts
3. mv_vendor_fhir_counts — vendor breakdown by FHIR version

All queries should accept optional query params: fhir_versions (comma-separated)
and vendor (string). Use parameterized queries ($1, $2) — never string concatenation.

Then create api/internal/handlers/endpoints.go implementing GET /api/v1/endpoints.
Query selected_fhir_endpoints_mv with server-side pagination (LIMIT/OFFSET),
sorting (ORDER BY with allowlisted column names only), and filtering by
fhir_versions, vendor, search (ILIKE across url and vendor_name),
and availability range.

Return PaginatedResponse with total_count from a COUNT(*) query.

Read db/sql/dbsetup.sql to understand the exact column names and types
for these materialized views.
```

### 3d: Build the Endpoint Detail Handler

```
Create api/internal/handlers/endpoint_details.go implementing:

1. GET /api/v1/endpoints/:url/details
   - Query fhir_endpoints_info by url (with requested_fhir_version param)
   - Include: vendor name (JOIN vendors), metadata (JOIN fhir_endpoints_metadata)
   - Parse capability_statement JSON for: software, implementation, format, kind
   - Include linked organizations from endpoint_organization + npi_organizations
   - Include linked products from healthit_products
   - Include supported profiles from supported_profiles JSONB column
   - Include resource types from capability_statement->'rest'->0->'resource'

2. GET /api/v1/endpoints/:url/response-time
   - Query fhir_endpoints_info_history for time-series data
   - Accept ?days=30 param (default 30)
   - Group by 23-hour buckets matching the current R logic in
     get_avg_response_time() in endpoints.R

3. GET /api/v1/endpoints/:url/http-history
   - Query fhir_endpoints_info_history for HTTP response codes over time
   - Same time bucketing as response-time

Read shinydashboard/lantern/functions/endpoints.R to see the exact queries
for get_endpoint_response_time(), get_endpoint_http_over_time(),
get_endpoint_resources(), get_endpoint_capstat_fields(),
get_endpoint_supported_profiles(), and get_endpoint_products().
```

### 3e: Build Remaining Handlers (batch by similarity)

```
Create the remaining API handlers. For each, read the corresponding
materialized view definition in db/sql/dbsetup.sql and the R query function
in shinydashboard/lantern/functions/endpoints.R:

1. api/internal/handlers/organizations.go — GET /api/v1/organizations
   Source: mv_organizations_final (has GIN indexes on array columns for filtering)
   Filters: vendor, fhir_versions, search, organization_detail=present

2. api/internal/handlers/resources.go — GET /api/v1/resources + /resources/chart
   Source: mv_endpoint_resource_types
   Filters: fhir_versions, vendor, resource (multi-value), operations (multi-value)

3. api/internal/handlers/fields.go — GET /api/v1/fields + /field-values
   Source: mv_capstat_fields_mv, mv_capstat_values_mv

4. api/internal/handlers/profiles.go — GET /api/v1/profiles
   Source: endpoint_supported_profiles_mv

5. api/internal/handlers/validations.go — GET /api/v1/validations/summary,
   /validations/details, /validations/failures
   Source: mv_validation_results_plot, mv_validation_details, mv_validation_failures

6. api/internal/handlers/security.go — GET /api/v1/security, /security/summary
   Source: security_endpoints_distinct_mv, mv_endpoint_security_counts, mv_auth_type_count

7. api/internal/handlers/smart.go — GET /api/v1/smart-response, /smart-response/summary
   Source: mv_well_known_endpoints, mv_smart_response_capabilities

8. api/internal/handlers/contacts.go — GET /api/v1/contacts
   Source: mv_contacts_info

9. api/internal/handlers/implementation.go — GET /api/v1/implementation-guides
   Source: mv_implementation_guide

10. api/internal/handlers/downloads.go — GET /api/v1/downloads/endpoints.csv,
    /downloads/organizations.csv
    Source: endpoint_export, mv_organizations_final (stream as CSV with
    Content-Disposition header)

11. api/internal/handlers/filters.go — GET /api/v1/filters/vendors,
    /filters/fhir-versions, /filters/resources, /filters/auth-types, /filters/profiles
    Source: SELECT DISTINCT queries on respective tables

All handlers must use parameterized queries. All list endpoints must support
page, page_size, sort_by, sort_dir params. Register all routes in router.go.
```

### 3f: API Dockerfile and Docker Compose

```
Create api/Dockerfile using multi-stage build:
- Builder: golang:1.21-alpine, build static binary
- Runtime: gcr.io/distroless/static-debian12, non-root user
- Expose 8080

Add lantern-api service to docker-compose.yml:
- Build context: ./api
- Environment: LANTERN_DB* read-only credentials from .env
- Depends on: postgres (with condition: service_healthy)
- Restart: on-failure:5
- Healthcheck: /health endpoint

Add the replace directive in api/go.mod for local module references
to endpointmanager if any shared code is needed. Otherwise keep the API
module independent.
```

### 3g: API Tests

```
Write unit tests for the Go API server:
1. api/internal/handlers/dashboard_test.go — test with sqlmock, verify JSON response
   structure, test with various filter combinations
2. api/internal/handlers/endpoints_test.go — test pagination (page 1, last page,
   beyond max), test search, test sort, test filter combinations
3. api/internal/handlers/endpoint_details_test.go — test normal case, test
   not-found (404), test malformed URL
4. api/internal/handlers/downloads_test.go — verify CSV output headers and format

Use DATA-TESTDB pattern: create test helpers that set up mock data and
tear down after each test.

Also add an integration test file api/internal/handlers/handlers_integration_test.go
with //go:build integration tag that tests against a real test database.
```

### 3h: Commit the API

```
/commit
```

---

## Step 4: Phase 2 — React Application Scaffold

### 4a: Initialize the React Project

```bash
# Run this in your terminal (not Claude Code) to scaffold:
cd /Users/srikanthaddala/Downloads/lanterncode/lantern-back-end-main
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query @tanstack/react-table recharts react-router-dom
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-dropdown-menu
npm install tailwindcss @tailwindcss/vite lucide-react date-fns
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom
```

Then back in Claude Code:

```
I've initialized a React + TypeScript project in frontend/.

Configure the following:
1. tailwind.config.ts — set up content paths for src/**/*.{ts,tsx},
   add a custom color palette matching the current Shiny dashboard
   (navy blue primary, teal accents — read shinydashboard/lantern/ui.R
   for the current color hex values)
2. vite.config.ts — add proxy for /api to http://localhost:8080 in dev mode
3. tsconfig.json — enable strict mode, add path alias "@/*" -> "src/*"
4. src/index.css — import Tailwind base/components/utilities
5. vitest.config.ts — set up with jsdom environment and testing-library
6. Remove all boilerplate from App.tsx and App.css
```

### 4b: API Client Layer

```
Create the API client layer in frontend/src/api/:

1. src/api/client.ts — fetch wrapper with:
   - Base URL from VITE_API_URL env var (default: "" for proxy in dev)
   - JSON parsing with error handling
   - Generic typed get<T>(path, params) function
   - Automatic query string construction from params object
   - 401/403/500 error handling

2. src/api/types.ts — TypeScript interfaces matching every Go API response model.
   Read api/internal/models/*.go and create corresponding TS interfaces:
   - PaginatedResponse<T>
   - Endpoint, EndpointDetail, EndpointTimeSeries
   - DashboardSummary, EndpointTotals, ResponseTally, VendorFhirCount
   - Organization
   - Resource, ResourceChartData
   - ValidationSummary, ValidationDetail, ValidationFailure
   - SecurityEndpoint, SecuritySummary
   - SmartEndpoint, SmartCapability
   - Contact
   - FilterOptions (vendors, fhirVersions, resources, authTypes, profiles)

3. src/api/endpoints.ts — typed API functions for every endpoint:
   - fetchDashboardSummary(filters)
   - fetchEndpoints(filters, pagination, search, sort)
   - fetchEndpointDetail(url, fhirVersion)
   - fetchEndpointResponseTime(url, fhirVersion, days)
   - fetchEndpointHttpHistory(url, fhirVersion, days)
   - fetchOrganizations(filters, pagination, search, sort)
   - fetchResources(filters, pagination)
   - fetchResourceChart(filters, resources, operations)
   - fetchFields(filters)
   - fetchFieldValues(filters, field, pagination)
   - fetchProfiles(filters, pagination, search)
   - fetchCapStatSizes(filters)
   - fetchValidationSummary(filters, group)
   - fetchValidationDetails(filters, group)
   - fetchValidationFailures(filters, ruleName, pagination)
   - fetchSecurity(filters, pagination, authType)
   - fetchSecuritySummary(filters)
   - fetchSmartResponse(filters, pagination)
   - fetchSmartSummary(filters)
   - fetchContacts(filters, pagination, search)
   - fetchImplementationGuides(filters)
   - fetchFilterOptions() — vendors, fhir versions, etc.
   - downloadCsv(type: 'endpoints' | 'organizations') — returns blob URL
```

### 4c: Shared Components

```
Create the reusable UI components in frontend/src/components/ui/:

1. DataTable.tsx — wraps @tanstack/react-table:
   - Props: columns (ColumnDef[]), data, isLoading, emptyMessage
   - Renders table header with sort indicators (click to toggle asc/desc)
   - Renders body rows with alternating row colors
   - Supports row click handler (for modals)
   - Shows skeleton rows when isLoading=true
   - Shows EmptyState when data is empty

2. Pagination.tsx:
   - Props: page, pageSize, totalCount, onPageChange, onPageSizeChange
   - Renders: "Showing X-Y of Z" + Prev/Next buttons + page input + "of N pages"
   - Page size selector: 10, 25, 50, 100
   - Disable Prev on page 1, disable Next on last page

3. SearchInput.tsx:
   - Props: value, onChange, placeholder
   - 300ms debounce (use useDebounce hook)
   - Clear button (X icon) when value is not empty
   - Search icon (Lucide)

4. FilterBar.tsx:
   - Props: children (slots for filter controls)
   - Horizontal flexbox layout with wrap
   - "Reset filters" button that clears all filters

5. MultiSelect.tsx — wraps Radix Select for FHIR version multi-select:
   - Props: options, selectedValues, onChange, placeholder
   - Checkboxes for each option
   - "Select All" / "Clear All" buttons
   - Badge count showing N selected

6. Select.tsx — wraps Radix Select for single-select dropdowns:
   - Props: options, value, onChange, placeholder

7. InfoBox.tsx — dashboard metric box:
   - Props: label, value (number), icon, color

8. Modal.tsx — wraps Radix Dialog:
   - Props: open, onClose, title, children
   - Accessible: focus trap, Escape to close, click outside to close

9. LoadingState.tsx — skeleton loader with configurable rows/cols
10. EmptyState.tsx — "No data found" with icon and optional message
11. DownloadButton.tsx — triggers CSV download with loading spinner

Use Tailwind for all styling. Match the current dashboard's navy/teal color scheme.
```

### 4d: Layout and Routing

```
Create the app layout and routing in frontend/src/:

1. src/App.tsx:
   - Wrap in QueryClientProvider (TanStack Query, staleTime: 5min,
     refetchOnWindowFocus: false)
   - Wrap in FilterProvider (our context)
   - Wrap in BrowserRouter
   - Render AppLayout

2. src/components/layout/AppLayout.tsx:
   - Left sidebar (collapsible) + main content area
   - Sidebar width: 240px expanded, 60px collapsed

3. src/components/layout/Sidebar.tsx:
   - Navigation links for all 15 tabs matching current Shiny sidebar:
     Dashboard, Endpoints, Organizations, Resources, Implementation Guides,
     Fields, Field Values, Profiles, CapabilityStatement Size, Validations,
     Security, SMART Response, Contacts, Downloads, About
   - Active state highlighting (match current route)
   - Lucide icons for each item
   - Collapse toggle button at bottom

4. src/components/layout/Header.tsx:
   - "Lantern" title + version badge
   - Environment banner (read from VITE_BANNER_TEXT, shown in dev/staging)
   - GitHub repo link icon button
   - Last refreshed timestamp

5. src/context/FilterContext.tsx:
   - State: fhirVersions (string[]), vendor (string | null)
   - Sync to URL params: ?fhir_versions=4.0.1,3.0.2&vendor=Epic
   - On filter change: reset all page states to 1
   - Load initial vendor list and FHIR version list on mount
     (from /api/v1/filters/vendors and /api/v1/filters/fhir-versions)

6. Routes (in App.tsx):
   / → redirect to /dashboard
   /dashboard → DashboardPage
   /endpoints → EndpointsPage
   /organizations → OrganizationsPage
   /resources → ResourcesPage
   /implementation-guides → ImplementationGuidesPage
   /fields → FieldsPage
   /field-values → FieldValuesPage
   /profiles → ProfilesPage
   /capstat-size → CapStatSizePage
   /validations → ValidationsPage
   /security → SecurityPage
   /smart-response → SmartResponsePage
   /contacts → ContactsPage
   /downloads → DownloadsPage
   /about → AboutPage
```

### 4e: Commit the Scaffold

```
/commit
```

---

## Step 5: Phase 3 — Build Each Page

Work through one page at a time. For each page, give Claude Code a focused prompt that references the current Shiny module for behavior parity.

### 5a: Dashboard Page

```
Build frontend/src/features/dashboard/DashboardPage.tsx.

Read shinydashboard/lantern/modules/dashboardmodule.R to understand the exact
layout and data displayed. The dashboard has:

1. Top row: 3 InfoBoxes — "All Endpoints", "Indexed Endpoints", "Non-Indexed Endpoints"
   plus 3 value boxes — "HTTP 200 Response", "Percent Indexed", "Percent Not Indexed"
   Data source: GET /api/v1/dashboard/summary → endpointTotals

2. Middle section: Vendor x FHIR Version table (VendorFhirTable.tsx)
   - Rows: top 10 vendors + "Others" row
   - Columns: vendor_name + one column per FHIR version + Total
   - Data source: GET /api/v1/dashboard/summary → vendorFhirCounts

3. Stacked bar chart (VendorFhirChart.tsx using Recharts StackedBarChart)
   - X axis: vendor names, Y axis: endpoint count, fill by FHIR version
   - Match the color scheme from the current Shiny dashboard

4. Bottom section: HTTP Response summary table + bar chart
   - Data source: GET /api/v1/dashboard/summary → responseTally

Use TanStack Query to fetch data. Apply global filters (fhirVersions, vendor)
from FilterContext. Show LoadingState while fetching.
```

### 5b: Endpoints Page + Detail Modal

```
Build frontend/src/features/endpoints/EndpointsPage.tsx and EndpointDetailModal.tsx.

Read shinydashboard/lantern/modules/endpointsmodule.R for the exact table columns
and filter behavior.

EndpointsPage:
- DataTable with columns: URL, API Info Source Name, Developer, FHIR Version,
  Supported Formats, Capability Statement Returned, HTTP Response, Availability
- Tab-specific filters (above table): availability range dropdown,
  source dropdown (CHPL, State Medicaid, Payer, Other, All)
- Search input filtering across URL and developer name
- Pagination (server-side)
- Click on URL → open EndpointDetailModal
- CSV download button

EndpointDetailModal:
Read server.R lines 780-900 for the detail modal structure. It has 5 Radix Tabs:

Tab 1 — Details:
  - Left panel: response time line chart (Recharts LineChart, fetch from
    /api/v1/endpoints/:url/response-time), HTTP response history chart
  - Right panel: status metrics (HTTP code, response time, SMART response,
    availability, TLS version, FHIR version, last updated)

Tab 2 — Organizations:
  - Table of linked organizations (name, NPI ID, city, state, zipcode)

Tab 3 — Capabilities:
  - Sub-sections: fields table, resource types table, SMART capabilities list,
    raw JSON viewer (collapsible <pre> block)

Tab 4 — Implementation Guides & Profiles:
  - IG list table, profiles list table

Tab 5 — Products:
  - CHPL products table (name, version, certification status, edition, practice type)
```

### 5c: Continue with each page...

Follow this same pattern for every remaining page. Each prompt should:

1. Name the specific page and file to create
2. Reference the exact Shiny module file to read for behavior parity
3. List the API endpoint(s) to consume
4. Describe the layout, filters, and interactions
5. Mention which shared components to use

Here are the prompts for the remaining pages (use one at a time):

```
Build frontend/src/features/organizations/OrganizationsPage.tsx.
Read shinydashboard/lantern/modules/organizationsmodule.R for the layout.
Data: GET /api/v1/organizations. Table columns: organization name, identifier types,
identifier values, addresses, endpoint URLs, FHIR versions, developers.
Multi-value columns use <br> separated display. Search, pagination, CSV download.
```

```
Build frontend/src/features/resources/ResourcesPage.tsx with dual view
(chart tab and table tab using Radix Tabs).
Read shinydashboard/lantern/modules/resourcesmodule.R.
Left column: resource type checkboxes. Right column: operation checkboxes.
Chart: horizontal bar chart grouped by resource type, filled by FHIR version.
Table: paginated (50 rows per page), columns: developer, FHIR version, resource type,
supported operations. Data: GET /api/v1/resources and /resources/chart.
```

```
Build frontend/src/features/implementation-guides/ImplementationGuidesPage.tsx.
Read shinydashboard/lantern/modules/implementguidemodule.R.
Stacked bar chart of implementation guides by count. Data: GET /api/v1/implementation-guides.
```

```
Build frontend/src/features/fields/FieldsPage.tsx and
frontend/src/features/fields/FieldValuesPage.tsx.
Read shinydashboard/lantern/modules/fieldsmodule.R.
FieldsPage: two tables — required fields and optional fields, with bar charts.
FieldValuesPage: field selector dropdown, values table, endpoint count bar chart.
Data: GET /api/v1/fields, GET /api/v1/field-values?field=X.
```

```
Build frontend/src/features/profiles/ProfilesPage.tsx.
Read shinydashboard/lantern/modules/profilesmodule.R.
Paginated table, resource type dropdown, profile dropdown, search.
Data: GET /api/v1/profiles.
```

```
Build frontend/src/features/capstat-size/CapStatSizePage.tsx.
Read shinydashboard/lantern/modules/capstatsizemodule.R.
Box plot (use Recharts BoxPlot or custom SVG) grouped by developer/FHIR version.
Statistics table: count, min, max, mean, std deviation.
Data: GET /api/v1/capstat-sizes.
```

```
Build frontend/src/features/validations/ValidationsPage.tsx.
Read shinydashboard/lantern/modules/validationsmodule.R.
Top: stacked bar chart (success/failure by rule).
Bottom: two-panel layout. Left: validation details table (click row to select rule).
Right: validation failures table (paginated, filtered by selected rule).
Validation group dropdown filter.
Data: GET /api/v1/validations/summary, /validations/details, /validations/failures?rule_name=X.
```

```
Build frontend/src/features/security/SecurityPage.tsx.
Read shinydashboard/lantern/modules/securitymodule.R.
Top: security summary counts (total indexed, HTTP 200, without capstat, with security).
Auth type count table. Auth type dropdown filter.
Bottom: paginated security endpoints table.
Data: GET /api/v1/security, /security/summary.
```

```
Build frontend/src/features/smart-response/SmartResponsePage.tsx.
Read shinydashboard/lantern/modules/smartresponsemodule.R.
Top: 3 summary tables (well-known support, vendor breakdown, no-doc endpoints).
SMART capabilities count table.
Bottom: paginated endpoints table.
Data: GET /api/v1/smart-response, /smart-response/summary.
```

```
Build frontend/src/features/contacts/ContactsPage.tsx.
Read shinydashboard/lantern/modules/contactsmodule.R.
Paginated contacts table with has-contact filter.
Click row to show contact detail modal.
Data: GET /api/v1/contacts.
```

```
Build frontend/src/features/downloads/DownloadsPage.tsx and
frontend/src/features/about/AboutPage.tsx.

Downloads: 4 CSV download buttons (endpoints, endpoint field descriptions,
organizations, organization field descriptions). REST API documentation section.

About: static content — read shinydashboard/lantern/modules/aboutmodule.R
for the current text content. Include version, license, and links.
```

### 5d: Commit after each page

```
/commit
```

---

## Step 6: Phase 4 — Testing

### 6a: Unit Tests

```
Write unit tests for the React app:

1. src/api/__tests__/endpoints.test.ts — mock fetch, test each API function
   sends correct URL and params, parses response correctly

2. src/hooks/__tests__/useDebounce.test.ts — test 300ms delay behavior

3. src/components/ui/__tests__/DataTable.test.tsx — test renders columns,
   sorts on header click, shows loading state, shows empty state

4. src/components/ui/__tests__/Pagination.test.tsx — test page navigation,
   disable states, page size change

5. src/features/dashboard/__tests__/DashboardPage.test.tsx — mock API,
   verify info boxes render correct numbers, chart renders

6. src/features/endpoints/__tests__/EndpointsPage.test.tsx — mock API,
   test search triggers API call after debounce, test filter changes,
   test pagination, test row click opens modal

7. src/context/__tests__/FilterContext.test.tsx — test filter state changes,
   URL sync

Use vitest and @testing-library/react. Mock fetch globally in test setup.
```

### 6b: E2E Tests

```
Set up Playwright E2E tests in frontend/e2e/:

1. e2e/navigation.spec.ts — click each sidebar link, verify correct page loads
2. e2e/dashboard.spec.ts — verify info boxes, table, and chart render with data
3. e2e/endpoints.spec.ts — search, filter, paginate, open detail modal,
   navigate all 5 modal tabs
4. e2e/downloads.spec.ts — click CSV download, verify file downloads
5. e2e/filters.spec.ts — change global FHIR version filter, verify all pages
   reflect the filter, verify URL params update

Create playwright.config.ts with baseURL: http://localhost:3000,
webServer command to start both the Go API and Vite dev server.
```

### 6c: API Data Parity Tests

```
Write a Go test file api/internal/handlers/parity_test.go with
//go:build parity tag.

This test should:
1. Query the current Plumber API at localhost:8989/daily/download
2. Query the new Go API at localhost:8080/api/v1/downloads/endpoints.csv
3. Parse both CSV outputs and compare row counts, column names, and
   a sample of 100 random rows for data equality
4. Do the same for organizations

This ensures the new API produces identical data to the old one.
```

---

## Step 7: Phase 5 — Docker Integration and Cutover

### 7a: Frontend Dockerfile

```
Create frontend/Dockerfile:
- Stage 1: node:20-alpine, npm ci, npm run build
- Stage 2: nginx:alpine, copy dist to /usr/share/nginx/html,
  copy nginx.conf that proxies /api/* to lantern-api:8080
- Run as nginx user (non-root)

Create frontend/nginx.conf with:
- SPA fallback (try_files $uri $uri/ /index.html)
- /api/ proxy to lantern-api:8080
- Gzip compression for JS/CSS/JSON
- Cache-Control headers for static assets (1 year for hashed files)
```

### 7b: Update Docker Compose

```
Update docker-compose.yml:
1. Add lantern-api service (build: ./api, port 8080, read-only DB user,
   depends_on postgres with service_healthy, healthcheck on /health)
2. Add lantern-frontend service (build: ./frontend, port 8090 externally
   mapping to 80 internally, depends_on lantern-api)
3. Keep shinydashboard on port 8091 temporarily (parallel run)
4. Keep plumber on port 8989 temporarily

Update docker-compose.override.yml:
- Expose lantern-api on port 8080 for dev
- Add lantern-frontend on port 3000 using Vite dev server
  (override command to npm run dev)
```

### 7c: CI/CD Updates

```
Update .github/workflows/test.yml to add:

1. New job: test-api
   - Go 1.21 setup with caching
   - Run: cd api && go test ./...
   - Run: cd api && go test -tags=integration ./... (with services)

2. New job: test-frontend
   - Node 20 setup with npm cache
   - Run: cd frontend && npm ci && npm test
   - Run: cd frontend && npx playwright install && npx playwright test

3. Update existing test-e2e to include the new React frontend in the
   docker-compose.test.yml stack

Update .github/workflows/static.yml to add:
- ESLint job for frontend: cd frontend && npx eslint src/
- TypeScript type check: cd frontend && npx tsc --noEmit
```

### 7d: Final Commit and Verification

```
/commit
```

Then run the full test suite:

```bash
make test          # Existing Go unit tests still pass
make test_int      # Existing integration tests still pass
cd api && go test ./...              # New API tests pass
cd frontend && npm test              # React unit tests pass
cd frontend && npx playwright test   # E2E tests pass
```

---

## Step 8: Decommission Old Frontend

After 2 weeks of stable parallel running:

```
Remove the old R/Shiny frontend and Plumber API:

1. Delete shinydashboard/ directory entirely
2. Delete the old api/download/ directory (plumber.R, restendpoints.R,
   downloadsmodule.R, the old Dockerfile)
3. Remove shinydashboard and plumber services from docker-compose.yml
4. Remove R-related files: shinydashboard/renv.lock, scripts/lintr.sh references
5. Update Makefile: remove lint_R target, update test targets
6. Update .github/workflows/static.yml: remove Rlintr job
7. Update CLAUDE.md to reflect the new architecture (React + Go API + Go workers)
8. Update README.md to document the new setup
```

```
/commit
```

---

## Tips for Working with Claude Code Throughout

**Keep context loaded.** At the start of each session:
```
Read MIGRATION_PLAN.md and CLAUDE.md for project context.
```

**One page per prompt.** Don't ask Claude Code to build 5 pages at once. One focused prompt per page produces better results.

**Reference the source.** Always point Claude Code to the specific Shiny module file to read. "Read shinydashboard/lantern/modules/endpointsmodule.R" gives it the exact behavior to replicate.

**Verify incrementally.** After each page, run the dev server and check the UI before moving to the next page:
```bash
cd frontend && npm run dev
```

**Use `/commit` after each meaningful milestone** — don't accumulate a giant diff.

**Use `/diff` to review** before committing. Claude Code will show you exactly what changed.

**If something breaks**, give Claude Code the error:
```
I'm getting this error when running npm run dev: [paste error].
Fix it in [specific file].
```
