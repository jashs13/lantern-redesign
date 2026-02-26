I've reviewed all three HTML design mockups carefully. These represent a significant UX paradigm shift — from the current Shiny dashboard's **data-centric, tab-per-table** navigation to a **user-centric, task-based** design. Let me analyze what's changed and provide updated implementation instructions.

---

## Design Analysis: What's Changed

### Current Shiny Dashboard (Old)
- **15 sidebar tabs**, each exposing a single data table or chart
- Navigation organized by **data type**: Endpoints, Organizations, Resources, Fields, Validations, Security, etc.
- Users must know which table holds the answer to their question
- No search-first experience, no landing page

### New Design (Your HTML Mockups)
- **Task-based navigation**: Home → Dashboard → Endpoints → Organizations → Developers → About
- **Search-first landing page** with prominent search bar and quick-access cards
- **Government-style design system** (USWDS-inspired): navy headers, accessible focus states, skip links, breadcrumbs
- **KPI dashboard** with real-time status cards, HTTP distribution, uptime trends, response time metrics
- **Organizations page** with faceted search/filter, active filter tags, sortable paginated table
- **6 top-level pages** instead of 15 tabs — the 15 data tables are consolidated under relevant top-level views

### Key Design Tokens Extracted from Your HTML

```
Primary:     #112e51 (navy dark), #205493 (navy), #4773aa (navy light)
Secondary:   #02bfe7 (cyan), #0095c8 (cyan dark)
Accent:      #2e8540 (green), #fdb81e (gold), #e31c3d (red)
Neutrals:    #f1f1f1, #d6d7d9, #aeb0b5, #5b616b, #323a45, #212121
Fonts:       'Source Sans 3' (sans), 'Merriweather' (serif), 'Source Code Pro' (mono)
Radii:       4px (standard), 8px (large)
Max Width:   1200px (home), 1400px (dashboard/orgs)
```

---

## Updated Step-by-Step Instructions for Claude Code

### Step 1: Load Context

```
Read these files to understand the full project context:
- MIGRATION_PLAN.md (original migration plan)
- CLAUDE.md (project architecture)

Also read these three HTML design mockups that define the NEW design direction:
- /Users/srikanthaddala/Downloads/Lantern_Index_V2.html (Home/Landing page)
- /Users/srikanthaddala/Downloads/Lantern_EndPoint_V2.html (Network Dashboard page)
- /Users/srikanthaddala/Downloads/Lantern_Organizations_V2.html (Organizations page)

These mockups replace the old Shiny dashboard design. The new design uses:
- Task-based navigation instead of data-table tabs
- Search-first landing page
- Government-style design system (USWDS-inspired)
- 6 top-level pages instead of 15 sidebar tabs
- CSS custom properties as design tokens

Summarize the key differences between the old migration plan and the new design.
```

---

### Step 2: Phase 0 — Prerequisites (Same as Before)

```
Fix the critical issues before starting React work:

1. Fix SQL injection in shinydashboard/lantern/functions/endpoints.R line 33 —
   replace paste0() SQL with glue_sql() parameterized queries.

2. Fix api/Dockerfile — stop baking LANTERN_DB* credentials into build args.
   Use runtime environment variables via an entrypoint script.

3. Update docker-compose.yml: postgres:11.10 → postgres:15,
   synchronous_commit=off → synchronous_commit=local, add healthcheck.
```

```
/commit
```

---

### Step 3: Phase 1 — Go API Server

The API endpoints change slightly to support the new design. Some endpoints are consolidated, and new ones are added for the search-first experience.

#### 3a: Scaffold

```
Create a new Go API server under api/ with this structure:

api/
├── cmd/server/main.go           # Entry point, chi router, graceful shutdown
├── internal/
│   ├── config/config.go         # Viper-based config reading LANTERN_DB* env vars
│   ├── database/pool.go         # sql.Open with pool tuning (25 open, 10 idle, 5min lifetime)
│   ├── handlers/
│   │   ├── search.go            # GET /api/v1/search — global search across endpoints, orgs, developers
│   │   ├── dashboard.go         # GET /api/v1/dashboard/summary — KPI cards, HTTP distribution, metrics
│   │   ├── dashboard_trends.go  # GET /api/v1/dashboard/trends?period=24h|7d|30d — uptime trend data
│   │   ├── endpoints.go         # GET /api/v1/endpoints — paginated endpoint list with filters
│   │   ├── endpoint_details.go  # GET /api/v1/endpoints/:url — full endpoint detail
│   │   ├── endpoint_timeseries.go # GET /api/v1/endpoints/:url/response-time, /http-history
│   │   ├── organizations.go     # GET /api/v1/organizations — paginated org table with faceted filters
│   │   ├── org_details.go       # GET /api/v1/organizations/:npi — org detail page
│   │   ├── developers.go        # GET /api/v1/developers — developer listing with metrics
│   │   ├── developer_details.go # GET /api/v1/developers/:id — developer detail page
│   │   ├── downloads.go         # GET /api/v1/downloads/endpoints.csv, /organizations.csv
│   │   ├── filters.go           # GET /api/v1/filters/* — dropdown options
│   │   └── health.go            # GET /health
│   ├── middleware/
│   │   ├── cors.go, logging.go, cache.go, ratelimit.go
│   ├── models/
│   │   ├── search.go            # SearchResult with type discriminator (endpoint|org|developer)
│   │   ├── dashboard.go         # KPICards, HttpDistribution, UptimeTrend, ResponseTimeDistribution
│   │   ├── endpoint.go, organization.go, developer.go
│   │   ├── pagination.go        # PaginatedResponse[T] generic wrapper
│   │   └── filters.go
│   └── router/router.go

Use chi router. Read-only DB user. Port 8080. Signal handling for SIGTERM/SIGINT.
The API module is github.com/onc-healthit/lantern-back-end/api with go 1.21.
```

#### 3b: Global Search Endpoint (New)

```
Create api/internal/handlers/search.go implementing GET /api/v1/search.

This is the new search-first experience from the landing page design. It accepts:
- q (string): search term
- type (optional): "endpoint", "organization", "developer", or "all" (default)
- limit (optional, default 10): max results per type

It should search across:
1. fhir_endpoints_info: match url ILIKE '%q%' or vendor name ILIKE '%q%'
2. npi_organizations: match name ILIKE '%q%' or npi_id = q (exact) or
   normalized_name ILIKE '%q%'
3. vendors: match name ILIKE '%q%'

Return a unified response:
{
  "results": [
    { "type": "organization", "name": "Mayo Clinic", "detail": "Rochester, MN",
      "npi": "1234567890", "endpoint_count": 23, "url": "/organizations/1234567890" },
    { "type": "endpoint", "name": "https://fhir.epic.com/...", "detail": "Epic Systems",
      "status": "200", "url": "/endpoints/..." },
    { "type": "developer", "name": "Epic Systems", "detail": "45,000 endpoints",
      "url": "/developers/epic" }
  ],
  "counts": { "endpoints": 42, "organizations": 15, "developers": 3 }
}

Use parameterized queries. Add a full-text search index later as optimization.
Read db/sql/dbsetup.sql to understand the exact table schemas.
```

#### 3c: Dashboard Endpoint (Redesigned)

```
Create api/internal/handlers/dashboard.go implementing GET /api/v1/dashboard/summary.

This serves the KPI cards and HTTP distribution from the new dashboard design
(Lantern_EndPoint_V2.html). It returns a single JSON response with:

1. kpi_cards:
   - available_count, available_percentage, available_change_1h
   - degraded_count, degraded_percentage, degraded_change_1h
   - down_count, down_percentage, down_change_1h
   - avg_response_time_ms, response_time_change_1d
   - uptime_24h_percentage
   - total_endpoints

2. http_distribution: array of { status_code, description, count, percentage,
   change_1h, typical_cause } for each HTTP status code bucket

3. response_time_distribution:
   { excellent_count (<100ms), good_count (100-500ms), fair_count (500-1000ms),
     slow_count (1-3s), very_slow_count (>3s) } with percentages

4. availability_by_period:
   { last_24h, last_7d, last_30d, last_90d } as percentages

Source views: mv_endpoint_totals, mv_response_tally, mv_http_responses,
fhir_endpoints_metadata (for response time distribution).

Also create GET /api/v1/dashboard/trends?period=24h|7d|30d returning time-series
data for the uptime chart. Source: fhir_endpoints_info_history grouped by time buckets.
```

#### 3d: Organizations Endpoint (Redesigned)

```
Create api/internal/handlers/organizations.go implementing GET /api/v1/organizations.

This serves the organizations table from the new design (Lantern_Organizations_V2.html).
The new design adds faceted filters not in the old Shiny dashboard:

Query parameters:
- q (string): search across name, NPI, city, address
- state (string): state code filter (CA, TX, NY, etc.)
- status (enum): "active", "issues", "excellent" (>99% uptime)
- developer (string): EHR developer filter
- sort (enum): "name", "name-desc", "endpoints", "uptime", "state"
- page, page_size

Response columns (matching the new table design):
- organization_name
- location (city, state — derived from npi_organizations.location JSONB)
- npi_id
- endpoint_count
- status_summary (e.g., "22 active, 1 down" with status indicator)
- primary_developer

Source: mv_organizations_final joined with fhir_endpoints_metadata for status data.
Also needs aggregated endpoint counts and status per organization.

Read the existing R query for organizations in
shinydashboard/lantern/functions/endpoints.R and adapt the SQL.
Also read db/sql/dbsetup.sql for the mv_organizations_final schema.
```

#### 3e: Build All Remaining Handlers

```
Build the remaining API handlers. The old migration plan's 15-tab endpoints
are consolidated into the new 6-page structure:

1. handlers/endpoints.go — GET /api/v1/endpoints
   Combines the old Endpoints, Resources, Fields, Profiles, Security, SMART Response,
   Validations, and Contacts tabs into a single endpoint listing.
   Filters: q, fhir_versions, developer, availability, source, http_status, sort
   Response: paginated list with URL, developer, FHIR version, HTTP status,
   availability, cap statement status, response time

2. handlers/endpoint_details.go — GET /api/v1/endpoints/:url
   Returns ALL detail data for one endpoint (replaces the old 5-tab modal):
   - overview: HTTP status, response time, availability, TLS, FHIR version
   - organizations: linked orgs list
   - capabilities: fields, resource types, SMART capabilities, supported profiles
   - implementation_guides: IGs list
   - products: CHPL products
   - contacts: contact info from capability statement
   - security: security service info
   - validations: validation results for this endpoint
   - raw_capability_statement: full JSON

3. handlers/endpoint_timeseries.go — GET /api/v1/endpoints/:url/response-time
   and /http-history (same as original plan)

4. handlers/developers.go — GET /api/v1/developers
   NEW endpoint (not in original Shiny). Aggregates vendor data:
   - vendor_name, endpoint_count, avg_availability, avg_response_time
   - fhir_versions supported (array), org_count
   Source: vendors + fhir_endpoints_info + fhir_endpoints_metadata aggregated

5. handlers/developer_details.go — GET /api/v1/developers/:id
   Full developer profile with all their endpoints and metrics.

6. handlers/downloads.go — same as original plan (endpoints.csv, organizations.csv)

7. handlers/filters.go — GET /api/v1/filters/states (NEW — list of US states
   with org counts), plus vendors, fhir-versions, resources, auth-types

For each handler, read the corresponding materialized view definitions in
db/sql/dbsetup.sql and the R functions in
shinydashboard/lantern/functions/endpoints.R.
All queries must use parameterized placeholders ($1, $2).
```

#### 3f: API Dockerfile and Docker Compose

```
Create api/Dockerfile using multi-stage build:
- Builder: golang:1.21-alpine
- Runtime: gcr.io/distroless/static-debian12, non-root user
- Expose 8080

Add lantern-api service to docker-compose.yml with healthcheck on /health.
Use read-only database credentials.
```

#### 3g: API Tests

```
Write unit tests for the Go API:
1. handlers/search_test.go — test multi-type search, empty query, type filtering
2. handlers/dashboard_test.go — test KPI calculation, HTTP distribution grouping
3. handlers/organizations_test.go — test faceted filters, state filter, status filter,
   sort options, pagination
4. handlers/endpoints_test.go — test search, filters, pagination, sort
5. handlers/downloads_test.go — verify CSV output matches expected format

Use sqlmock for unit tests. Add integration test files with //go:build integration tag.
```

```
/commit
```

---

### Step 4: Phase 2 — React Scaffold with New Design System

#### 4a: Initialize Project

```bash
cd /Users/srikanthaddala/Downloads/lanterncode/lantern-back-end-main
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query @tanstack/react-table recharts react-router-dom
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-navigation-menu
npm install tailwindcss @tailwindcss/vite lucide-react date-fns clsx
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

#### 4b: Design System Setup

```
I've initialized a React+TypeScript project in frontend/. Configure the design system
based on the CSS custom properties from the three HTML mockups.

1. tailwind.config.ts — extend with the exact design tokens from the mockups:
   colors:
     primary: { darkest: '#0a1628', dark: '#112e51', DEFAULT: '#205493',
                light: '#4773aa', lighter: '#8ba6ca' }
     secondary: { DEFAULT: '#02bfe7', dark: '#0095c8' }
     accent: { green: '#2e8540', 'green-light': '#4aa564', gold: '#fdb81e', red: '#e31c3d' }
     gray: { lightest: '#f1f1f1', lighter: '#d6d7d9', light: '#aeb0b5',
             DEFAULT: '#5b616b', dark: '#323a45' }
     status: { available: '#2e8540', degraded: '#fdb81e', down: '#e31c3d', info: '#02bfe7' }
     http: { '2xx': '#2e8540', '2xx-bg': '#e7f4e9', '3xx': '#205493', '3xx-bg': '#e8f0f8',
             '4xx': '#b56a00', '4xx-bg': '#fff3e0', '5xx': '#b51b35', '5xx-bg': '#fbe9ec',
             'timeout': '#5b616b', 'timeout-bg': '#f1f1f1' }
   fontFamily:
     sans: ["'Source Sans 3'", ...defaultTheme.fontFamily.sans]
     serif: ["'Merriweather'", 'Georgia', 'serif']
     mono: ["'Source Code Pro'", "'Courier New'", 'monospace']
   borderRadius: { sm: '4px', lg: '8px' }
   maxWidth: { content: '1200px', wide: '1400px' }
   boxShadow: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.07)',
                 lg: '0 10px 25px rgba(0,0,0,0.1)' }

2. src/index.css — import Google Fonts (Source Sans 3, Merriweather, Source Code Pro),
   Tailwind directives, focus-visible outline style (3px solid secondary, 2px offset),
   smooth scrolling, antialiased text

3. vite.config.ts — proxy /api to http://localhost:8080

4. tsconfig.json — strict mode, path alias "@/*" -> "src/*"
```

#### 4c: New Project Structure

```
Create the updated project structure for the new design. The old plan had 15 feature
folders matching 15 sidebar tabs. The new design consolidates into 6 pages:

frontend/src/
├── api/
│   ├── client.ts               # Fetch wrapper with base URL and error handling
│   ├── types.ts                # TypeScript interfaces matching Go API models
│   └── endpoints.ts            # Typed API functions for every endpoint
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx       # Header + main content + footer (NO sidebar)
│   │   ├── Header.tsx          # Navy header with logo, nav links, mobile menu toggle
│   │   ├── Footer.tsx          # Dark navy footer with links and branding
│   │   ├── Breadcrumb.tsx      # Breadcrumb nav (Home > Organizations)
│   │   └── GovBanner.tsx       # Optional government banner strip
│   ├── ui/
│   │   ├── DataTable.tsx       # TanStack Table wrapper with sort indicators
│   │   ├── Pagination.tsx      # Prev/1/2/3/.../129/Next pattern from orgs mockup
│   │   ├── SearchInput.tsx     # Full-width search with icon (from home mockup)
│   │   ├── FilterBar.tsx       # Horizontal filter grid with dropdowns
│   │   ├── FilterTag.tsx       # Active filter pill with × remove (from orgs mockup)
│   │   ├── Select.tsx          # Filter dropdown (Radix Select)
│   │   ├── KPICard.tsx         # KPI metric card with change indicator and icon
│   │   ├── StatusCard.tsx      # HTTP status category card with mini sparkline
│   │   ├── StatusDot.tsx       # Green/yellow/red dot for endpoint status
│   │   ├── StatusBar.tsx       # Segmented availability bar (from home mockup)
│   │   ├── StatCard.tsx        # Large number + label card (from home stats section)
│   │   ├── TaskCard.tsx        # Action card with icon, title, description, link arrow
│   │   ├── MetricCard.tsx      # Metric with breakdown list (response time, availability)
│   │   ├── ActionCard.tsx      # Quick action card (from dashboard)
│   │   ├── TimeSelector.tsx    # 24h/7d/30d button group
│   │   ├── ResultsBar.tsx      # "Showing X results" + sort dropdown
│   │   ├── DeveloperTag.tsx    # Gray pill showing developer name
│   │   ├── Modal.tsx           # Radix Dialog wrapper
│   │   ├── LoadingState.tsx    # Skeleton loader
│   │   ├── EmptyState.tsx      # Empty state with icon and message
│   │   └── DownloadButton.tsx  # CSV download trigger
│   └── charts/
│       ├── StackedBarChart.tsx
│       ├── TimeSeriesChart.tsx  # Uptime trend line chart
│       ├── SparklineBar.tsx     # Mini bar chart inside status cards
│       └── BoxPlot.tsx
├── features/
│   ├── home/
│   │   ├── HomePage.tsx         # Landing page with hero, search, task cards, stats
│   │   ├── HeroSection.tsx      # Gradient hero with title and endpoint count
│   │   ├── SearchSection.tsx    # Floating search card with quick links
│   │   ├── TasksSection.tsx     # "What Can You Do?" 6-card grid
│   │   ├── StatsSection.tsx     # Network at a Glance with stat cards + status bar
│   │   └── PopularSection.tsx   # Popular searches by category
│   ├── dashboard/
│   │   ├── DashboardPage.tsx    # Network Health Dashboard
│   │   ├── KPIGrid.tsx          # 6 KPI cards row
│   │   ├── HttpDistribution.tsx # Status code cards + detailed table
│   │   ├── UptimeTrends.tsx     # Time series chart with period selector
│   │   ├── PerformanceMetrics.tsx # Response time + availability metric cards
│   │   └── QuickActions.tsx     # Quick action card grid
│   ├── endpoints/
│   │   ├── EndpointsPage.tsx    # Endpoint browser (consolidates old tabs)
│   │   ├── EndpointTable.tsx    # Paginated sortable table
│   │   ├── EndpointFilters.tsx  # Filter bar specific to endpoints
│   │   └── EndpointDetailPage.tsx # Full endpoint detail page (or modal)
│   ├── organizations/
│   │   ├── OrganizationsPage.tsx # Organization browser with faceted search
│   │   ├── OrganizationTable.tsx # Table with status dots, developer tags
│   │   ├── OrganizationFilters.tsx # State, Status, Developer dropdowns
│   │   └── OrgDetailPage.tsx    # Organization detail page
│   ├── developers/
│   │   ├── DevelopersPage.tsx   # Developer listing (NEW — not in old Shiny)
│   │   └── DeveloperDetailPage.tsx
│   ├── downloads/
│   │   └── DownloadsPage.tsx
│   └── about/
│       └── AboutPage.tsx        # About section (from home mockup bottom)
├── hooks/
│   ├── useSearch.ts             # Global search state and API call
│   ├── useFilters.ts            # Per-page filter state + URL sync
│   ├── usePagination.ts
│   └── useDebounce.ts
├── lib/
│   ├── formatters.ts            # Number formatting (toLocaleString), dates
│   ├── constants.ts             # Status colors, FHIR version groups, page sizes
│   └── url.ts                   # URL param sync utilities
├── App.tsx
├── main.tsx
└── index.css

Create ALL these files with placeholder implementations (export default function
ComponentName() { return <div>ComponentName</div> }) so the project compiles.
Set up routing in App.tsx with these routes:
  / → HomePage
  /dashboard → DashboardPage
  /endpoints → EndpointsPage
  /endpoints/:url → EndpointDetailPage
  /organizations → OrganizationsPage
  /organizations/:npi → OrgDetailPage
  /developers → DevelopersPage
  /developers/:id → DeveloperDetailPage
  /downloads → DownloadsPage
  /about → AboutPage
```

```
/commit
```

#### 4d: API Client Layer

```
Create the API client layer:

1. src/api/client.ts — fetch wrapper with:
   - Base URL from VITE_API_URL (default "" for Vite proxy)
   - Generic get<T>(path, params) with automatic query string
   - Error handling (throw on non-2xx with status code and message)

2. src/api/types.ts — interfaces matching Go models:
   - SearchResult { type, name, detail, url, npi?, status?, endpoint_count? }
   - SearchResponse { results: SearchResult[], counts: Record<string, number> }
   - DashboardSummary { kpi_cards, http_distribution, response_time_distribution,
     availability_by_period }
   - KPICard { label, value, change_text, change_direction, percentage, subtitle }
   - HttpStatusRow { status_code, description, count, percentage, change_1h, cause }
   - UptimeTrendPoint { timestamp, uptime_percentage }
   - Endpoint { url, developer, fhir_version, http_response, availability,
     cap_stat_exists, response_time_ms, list_source, endpoint_names }
   - EndpointDetail { ...Endpoint, organizations, capabilities, security,
     validations, products, contacts, implementation_guides, raw_capability_statement }
   - Organization { name, location, npi_id, endpoint_count, status_summary,
     status_indicator, primary_developer }
   - Developer { id, name, endpoint_count, org_count, avg_availability,
     avg_response_time, fhir_versions }
   - PaginatedResponse<T> { data: T[], pagination: { page, page_size,
     total_count, total_pages } }
   - FilterOptions { states, vendors, fhir_versions, statuses }

3. src/api/endpoints.ts — typed functions:
   - search(q, type?, limit?)
   - fetchDashboardSummary()
   - fetchDashboardTrends(period)
   - fetchEndpoints(params)
   - fetchEndpointDetail(url)
   - fetchEndpointResponseTime(url, days)
   - fetchEndpointHttpHistory(url, days)
   - fetchOrganizations(params)
   - fetchOrgDetail(npi)
   - fetchDevelopers(params)
   - fetchDeveloperDetail(id)
   - fetchFilterOptions()
   - downloadCsv(type)
```

```
/commit
```

---

### Step 5: Build Each Page (New Design)

#### 5a: Layout Components

```
Build the layout components matching the HTML mockups exactly.

Read /Users/srikanthaddala/Downloads/Lantern_Index_V2.html for the header,
footer, and nav structure.

1. src/components/layout/Header.tsx:
   - Navy background (#112e51)
   - Left: brand logo (gradient circle #02bfe7 → #0095c8 with 🔦 emoji) +
     "Lantern" in Merriweather bold + "FHIR Endpoint Monitor" subtitle
   - Right: horizontal nav links — Home, Dashboard, Endpoints, Organizations,
     Developers, About
   - Active link gets rgba(255,255,255,0.15) background
   - Mobile: hamburger "Menu" button, nav collapses into vertical dropdown
   - Use React Router NavLink for active state

2. src/components/layout/Footer.tsx:
   - Darkest navy background (#0a1628)
   - Top row: brand + nav links (Privacy, Terms, API Docs, About, Contact, Data Sources)
   - Bottom row: copyright + tagline
   - Divider line between top and bottom

3. src/components/layout/AppLayout.tsx:
   - No sidebar (the new design uses top nav, not sidebar!)
   - Structure: <Header /> + <main>{children}</main> + <Footer />
   - Main content has max-width container

4. src/components/layout/Breadcrumb.tsx:
   - Simple: Home > Current Page
   - White background, gray border bottom
   - Links in primary blue

Build these with Tailwind using the exact colors from the design tokens.
```

#### 5b: Shared UI Components

```
Build the reusable UI components extracted from the three HTML mockups.

Read all three HTML files for the exact styling and structure:

1. KPICard.tsx (from Lantern_EndPoint_V2.html .kpi-card):
   - Props: label, value, changeText, changeDirection ('up'|'down'|'neutral'),
     subtitle, variant ('default'|'success'|'warning'|'danger'), icon
   - White card, colored left border (4px), uppercase small label, large value,
     pill-shaped change indicator with arrow, subtitle text

2. StatusCard.tsx (from .status-card):
   - Props: statusCode, title, description, count, percentage, sparklineData
   - Clickable card with colored badge (2xx green, 3xx blue, 4xx amber, 5xx red,
     timeout gray), count, percentage, 8-bar sparkline at bottom

3. StatCard.tsx (from .stat-card in home page):
   - Props: number, label
   - White card, primary left border, large centered number, small label

4. TaskCard.tsx (from .task-card in home page):
   - Props: icon, title, description, linkText, linkHref
   - Icon box, title, description, link with → arrow that extends on hover

5. StatusBar.tsx (from .status__bar):
   - Props: segments: { label, count, percentage, variant }[]
   - Horizontal stacked bar with legend below

6. MetricCard.tsx (from .metric-card):
   - Props: header, value, label, breakdownItems: { label, value }[]
   - Value + label top, divider, breakdown list below

7. ActionCard.tsx (from .action-card):
   - Props: icon, title, description, onClick or href
   - Centered icon, title, description, hover lift effect

8. TimeSelector.tsx (from .time-btn group):
   - Props: options: string[], value, onChange
   - Horizontal button group, active state filled primary blue

9. FilterTag.tsx (from .filter-tag):
   - Props: label, value, onRemove
   - Pill with "Label: Value" + × button

10. ResultsBar.tsx (from .results-bar):
    - Props: totalCount, sortValue, sortOptions, onSortChange
    - "Showing X organizations" left, sort dropdown right

11. DeveloperTag.tsx (from .developer-tag):
    - Props: name
    - Gray background pill with developer name

12. StatusDot.tsx (from .status-dot):
    - Props: status ('available'|'degraded'|'down')
    - 10px colored circle

13. DataTable.tsx — TanStack Table wrapper with:
    - Sortable column headers (matching .data-table styling)
    - Uppercase small header text, gray background
    - Row hover highlight, keyboard focus within
    - Cursor pointer on clickable rows

14. Pagination.tsx (from .pagination in orgs mockup):
    - Props: page, totalPages, onPageChange
    - ← Previous | 1 | 2 | 3 | 4 | 5 | ... | 129 | Next →
    - Active page has primary background, disabled buttons grayed out

15. SearchInput.tsx (from .search__input in home mockup):
    - Full width, left search icon, large padding, 2px border
    - Focus: primary border + blue box-shadow ring
    - 300ms debounce
```

#### 5c: Home Page (Landing Page)

```
Build the home/landing page matching Lantern_Index_V2.html exactly.

Read /Users/srikanthaddala/Downloads/Lantern_Index_V2.html for the structure.

src/features/home/HomePage.tsx — assembles all sections:

1. HeroSection.tsx:
   - Gradient background: primary-dark → primary
   - Decorative radial gradient circles (CSS)
   - H1: "Healthcare Data Exchange Transparency" in Merriweather
   - Subtitle paragraph
   - Gold stat pill: "{count} endpoints monitored daily" — fetch count from
     GET /api/v1/dashboard/summary

2. SearchSection.tsx:
   - White card floating over hero (negative margin overlap)
   - Rounded corners, large shadow
   - Label: "Find Endpoints, Organizations, or Developers"
   - SearchInput + "Search" button
   - Quick links row: Most Viewed, Recently Added, Browse by Organization,
     Browse by Developer (link to respective pages)
   - On submit: navigate to /endpoints?q=searchTerm or /organizations?q=searchTerm
     depending on result type, OR show inline results dropdown

3. TasksSection.tsx:
   - Section heading: "What Can You Do?"
   - 6 TaskCards in auto-fit grid (minmax 320px):
     - Find a Specific Endpoint → /endpoints
     - Compare Organizations → /organizations
     - Evaluate EHR Developers → /developers
     - Check Compliance Status → /endpoints?filter=compliance
     - Plan a Research Project → /endpoints?view=resources
     - Download Bulk Data → /downloads

4. StatsSection.tsx:
   - Gray background section
   - "Network at a Glance" heading + "Last Updated" timestamp
   - 4 StatCards: Total Endpoints, Healthcare Organizations, EHR Developers,
     Currently Available % — all from GET /api/v1/dashboard/summary
   - StatusBar showing Available/Degraded/Down with counts and percentages
   - Legend below bar

5. PopularSection.tsx:
   - "Popular Searches" heading
   - 3 category cards: Organizations, Developers, By Location
   - Each has clickable tag pills linking to filtered views

6. AboutSection.tsx (bottom, dark background):
   - "About Lantern" heading + description
   - 4 feature items with checkmark icons
   - Link buttons: How It Works, Data Methodology, FAQs, API Documentation, Contact
```

#### 5d: Dashboard Page

```
Build the Network Health Dashboard matching Lantern_EndPoint_V2.html exactly.

Read /Users/srikanthaddala/Downloads/Lantern_EndPoint_V2.html for the structure.

src/features/dashboard/DashboardPage.tsx:
- Gray background page (bg-gray-lightest)
- Update banner: green pulse dot + "Live Data" + "Last updated: {time}" +
  "Next refresh in X hours Y minutes" + "Refresh Now" link
- Page header: "Network Health Dashboard" + subtitle with endpoint count

1. KPIGrid.tsx:
   - 6 KPICards in auto-fit grid (minmax 220px):
     - Available Now (success variant, green border)
     - Degraded (warning variant, gold border)
     - Down (danger variant, red border)
     - Avg Response Time (default)
     - 24h Uptime (default)
     - Data Exchanges (default)
   - Data from GET /api/v1/dashboard/summary → kpi_cards

2. HttpDistribution.tsx:
   - Section card: "HTTP Status Code Distribution"
   - 5 StatusCards in grid: 2xx, 3xx, 4xx, 5xx, Timeout/Unreachable
   - Each has sparkline visualization and click to filter endpoints
   - Below: full DataTable with columns: Status Code, Description, Count,
     Percentage, Change (1h), Typical Cause
   - Status codes color-coded with monospace font
   - Data from dashboard summary → http_distribution

3. UptimeTrends.tsx:
   - Section card: "Network Uptime Trends" + TimeSelector (24h/7d/30d)
   - Recharts LineChart showing uptime over time
   - Stats below chart: Average, Peak, Low
   - Data from GET /api/v1/dashboard/trends?period=X

4. PerformanceMetrics.tsx:
   - 2-column grid of MetricCards:
     - Response Time Distribution (5 breakdown tiers)
     - Availability by Time Period (24h, 7d, 30d, 90d)

5. QuickActions.tsx:
   - Section card: "Quick Actions"
   - 6 ActionCards: View Down Endpoints, View Degraded, Export Report,
     Compliance Status, Historical Trends, Organizations
```

#### 5e: Organizations Page

```
Build the Organizations page matching Lantern_Organizations_V2.html exactly.

Read /Users/srikanthaddala/Downloads/Lantern_Organizations_V2.html for the structure.

src/features/organizations/OrganizationsPage.tsx:
- Gray background, Breadcrumb (Home > Organizations)
- Page header: "Healthcare Organizations" + count subtitle

1. OrganizationFilters.tsx:
   - White card with:
   - Top row: full-width SearchInput + green "Export to CSV" button
   - Filter grid (3 columns): State/Region dropdown, Endpoint Status dropdown,
     EHR Developer dropdown
   - Active filter tags row (FilterTag components with × remove buttons)
   - Fetch filter options from GET /api/v1/filters/states, /filters/vendors
   - All filters sync to URL params (?state=CA&developer=epic&q=mayo)

2. ResultsBar: "Showing {count} organizations" + sort dropdown

3. OrganizationTable.tsx:
   - DataTable with columns:
     - Organization Name (bold, primary blue link)
     - Location (City, State)
     - NPI (monospace, gray)
     - Endpoints (bold count)
     - Status (StatusDot + "X active, Y down" text)
     - Primary Developer (DeveloperTag pill)
   - Rows are clickable (navigate to /organizations/:npi)
   - Keyboard accessible (Enter/Space to navigate)
   - Data from GET /api/v1/organizations with all filter params

4. Pagination component below table

Use TanStack Query with keepPreviousData for smooth page transitions.
All filters trigger new API calls (server-side filtering).
```

#### 5f: Endpoints Page

```
Build the Endpoints page. This consolidates the old 15-tab Shiny layout into
a single searchable, filterable endpoint browser.

src/features/endpoints/EndpointsPage.tsx:
- Same layout pattern as OrganizationsPage (breadcrumb, filters, table, pagination)
- Filters: search, FHIR version multi-select, developer dropdown, availability range,
  source (CHPL/Medicaid/Payer), HTTP status dropdown
- Table columns: URL (linked), Developer, FHIR Version, HTTP Status (color-coded),
  Availability (percentage), Response Time, Cap Statement (yes/no)
- Row click → navigate to /endpoints/:encodedUrl

src/features/endpoints/EndpointDetailPage.tsx:
- Full page (not modal) for endpoint details
- Breadcrumb: Home > Endpoints > {url}
- Top: status overview card (HTTP code, response time, availability, TLS, FHIR version)
- Radix Tabs: Overview | Resources | Security | Validations | Products | Raw JSON
  - Overview: response time chart, HTTP history chart, organizations, contacts
  - Resources: resource type table, supported profiles
  - Security: security service, SMART capabilities, implementation guides
  - Validations: validation results for this endpoint
  - Products: CHPL products
  - Raw JSON: collapsible formatted JSON viewer
```

#### 5g: Developers Page (New)

```
Build the Developers page. This is NEW — not in the old Shiny dashboard.

src/features/developers/DevelopersPage.tsx:
- Same layout pattern: breadcrumb, search, filters, table
- Table columns: Developer Name, Endpoint Count, Org Count, Avg Availability,
  Avg Response Time, FHIR Versions Supported
- Row click → /developers/:id

src/features/developers/DeveloperDetailPage.tsx:
- Developer name header + summary metrics
- Tabs: Endpoints (table of all their endpoints) | Organizations (orgs using them) |
  Metrics (availability over time, response time trends)
```

#### 5h: Downloads and About Pages

```
Build the remaining pages:

src/features/downloads/DownloadsPage.tsx:
- 4 CSV download cards: Endpoints, Endpoint Field Descriptions,
  Organizations, Organization Field Descriptions
- Each card: title, description, file size estimate, Download button
- API documentation section with endpoint descriptions

src/features/about/AboutPage.tsx:
- Match the "About Lantern" section from the home page mockup but as full page
- Project description, 4 feature highlights, methodology, links
- Version number, license info, GitHub link
```

After each page, commit:

```
/commit
```

---

### Step 6: Testing

```
Write tests for the React app:

1. Unit tests (Vitest + React Testing Library):
   - api/endpoints.test.ts — mock fetch, verify URL construction for all functions
   - components/ui/DataTable.test.tsx — sort, loading, empty state
   - components/ui/Pagination.test.tsx — page navigation, disabled states
   - components/ui/KPICard.test.tsx — renders value, change indicator, variant styling
   - components/ui/FilterTag.test.tsx — renders label, fires onRemove
   - features/home/HomePage.test.tsx — renders all sections, search submits
   - features/dashboard/DashboardPage.test.tsx — KPIs render, chart renders
   - features/organizations/OrganizationsPage.test.tsx — filters, search, pagination,
     table rendering, row click navigation
   - features/endpoints/EndpointsPage.test.tsx — same pattern

2. E2E tests (Playwright):
   - e2e/navigation.spec.ts — header nav links, breadcrumbs
   - e2e/home.spec.ts — search from landing page navigates to results
   - e2e/dashboard.spec.ts — KPIs render, time selector switches data
   - e2e/organizations.spec.ts — filter by state, search, sort, paginate,
     click row → detail page
   - e2e/endpoints.spec.ts — same pattern
   - e2e/downloads.spec.ts — CSV download works
   - e2e/responsive.spec.ts — mobile menu toggle, table scrolls, filters stack

Set up Playwright config with webServer starting both Go API and Vite dev server.
```

```
/commit
```

---

### Step 7: Docker and Deployment

```
Create frontend/Dockerfile:
- Stage 1: node:20-alpine, npm ci, npm run build
- Stage 2: nginx:alpine, copy dist, copy nginx.conf
- Non-root user

Create frontend/nginx.conf:
- SPA fallback (try_files $uri /index.html)
- /api/ proxy to lantern-api:8080
- Gzip for JS/CSS/JSON
- Cache-Control: 1 year for hashed assets, no-cache for index.html

Update docker-compose.yml:
- Add lantern-api (port 8080, read-only DB, healthcheck)
- Add lantern-frontend (port 8090 → 80, depends on lantern-api)
- Keep old Shiny on 8091 temporarily for parallel comparison
- Remove old Plumber API (replaced by Go API)

Update docker-compose.override.yml:
- Frontend on port 3000 with Vite dev server override
- API on 8080 exposed
```

```
/commit
```

---

### Step 8: CI/CD Updates

```
Update .github/workflows/test.yml:

1. New job: test-api (Go 1.21, cd api && go test ./...)
2. New job: test-frontend (Node 20, cd frontend && npm ci && npm test)
3. New job: test-e2e-frontend (Playwright, needs both API and frontend running)

Update .github/workflows/static.yml:
- Add ESLint job: cd frontend && npx eslint src/
- Add TypeScript check: cd frontend && npx tsc --noEmit
- Keep existing Go lint job
- Remove R lint job (will be removed after decommission)

Add .github/workflows/build.yml:
- Build Docker images for api and frontend
- Run trivy container scan on both images
```

```
/commit
```

---

### Step 9: Parallel Run and Cutover

```
During parallel run, verify data parity:

1. Compare dashboard numbers: Go API vs Shiny dashboard
2. Compare organization counts and data: new filters produce same results
3. Compare CSV downloads: identical column order and data
4. Verify all endpoint detail data matches

After 2 weeks of stable operation:

Remove old frontend:
- Delete shinydashboard/ directory
- Delete api/download/ (old Plumber API)
- Remove shinydashboard and plumber services from docker-compose.yml
- Remove R-related files (renv.lock, Dockerfile.shiny)
- Remove make lint_R target and R lint CI job
- Update CLAUDE.md to reflect new architecture
- Update README.md
```

```
/commit
```

---

### Key Differences from the Original Migration Plan

| Aspect | Original Plan | Updated Plan |
|--------|--------------|-------------|
| **Navigation** | 15-item sidebar (data-centric) | 6-item top nav (task-centric) |
| **Landing page** | None (straight to dashboard) | Search-first hero page with task cards |
| **Dashboard** | Shiny-style info boxes + tables | KPI cards, HTTP status cards with sparklines, uptime trends, performance metrics |
| **Organizations** | Basic table with pagination | Faceted search with state/status/developer filters, active filter tags, sort options |
| **Developers** | Did not exist | New dedicated page with aggregated metrics |
| **Endpoint detail** | 5-tab modal popup | Full detail page with URL-based routing |
| **Search** | Per-table text search | Global cross-entity search from landing page |
| **Design system** | Tailwind defaults + Shiny colors | USWDS-inspired government design tokens from your mockups |
| **Layout** | Sidebar + content | Header (top nav) + breadcrumb + content + footer |
| **Styling** | Custom component library | Design tokens extracted from your HTML mockups (exact hex values, fonts, spacing) |
