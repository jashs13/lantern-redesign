# Lantern Backend - Engineering Review

## Table of Contents

- [Executive Summary](#executive-summary)
- [Front-End (R/Shiny Dashboard)](#front-end-rshiny-dashboard)
- [Go Backend Services](#go-backend-services)
- [R Plumber API](#r-plumber-api)
- [Database](#database)
- [Infrastructure & DevOps](#infrastructure--devops)
- [Priority Action Plan](#priority-action-plan)

---

## Executive Summary

Lantern is a well-architected microservices platform with clear separation of concerns, comprehensive test coverage, and solid queue-based decoupling. However, it carries significant technical debt across **outdated runtime versions** (Go 1.16, PostgreSQL 11.10, R 3.6.3 — all EOL), **security gaps** (SQL injection, credentials in Docker images, containers running as root), and **operational brittleness** (hardcoded container names, no graceful shutdown, missing health checks). The findings below are organized by layer with specific file references and concrete remediation steps.

### Severity Legend

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Security vulnerability or EOL runtime — fix immediately |
| **HIGH** | Production reliability risk — fix within 1 sprint |
| **MEDIUM** | Maintainability or performance issue — plan for near-term |
| **LOW** | Code quality or style improvement — address opportunistically |

---

## Front-End (R/Shiny Dashboard)

### 1. SQL Injection Vulnerability

**Severity: CRITICAL**

`shinydashboard/lantern/functions/endpoints.R` line 33 constructs SQL via string concatenation:

```r
sql(paste0("SELECT url, UNNEST(endpoint_names) as endpoint_names_list
            FROM endpoint_export WHERE url = '", endpoint, "' ORDER BY endpoint_names_list"))
```

User-controlled input (`endpoint`) is interpolated directly into the query. This is a textbook SQL injection vector.

**Fix:** Use parameterized queries consistently:
```r
glue_sql("SELECT url, UNNEST(endpoint_names) as endpoint_names_list
          FROM endpoint_export WHERE url = {endpoint}
          ORDER BY endpoint_names_list", .con = db_connection)
```

A related HTML injection risk exists in `server.R` line 787 where `HTML()` renders unsanitized database content:
```r
p(HTML(str_replace_all(get_endpoint_organization_list(input$show_details), ";", "<br>")))
```

---

### 2. Legacy Shiny Module Pattern

**Severity: MEDIUM**

`server.R` lines 63-157 use the deprecated `callModule()` API:

```r
callModule(dashboard, "dashboard_page", reactive(input$httpvendor))
```

The modern `moduleServer()` pattern (Shiny 1.5+) provides better type safety, simpler function signatures, and aligns with current Shiny best practices. All 14 modules follow this legacy pattern.

---

### 3. No Database Connection Pooling

**Severity: HIGH**

`shinydashboard/lantern/functions/db_connection.R` creates a single global connection:

```r
db_connection <- dbConnect(RPostgres::Postgres(), ...)
```

With multiple concurrent dashboard users, this single connection becomes a bottleneck and a single point of failure. If the connection drops, the entire app goes down.

**Fix:** Use `pool::dbPool()` which manages a connection pool with automatic reconnection:
```r
db_connection <- pool::dbPool(
  RPostgres::Postgres(),
  dbname = Sys.getenv("LANTERN_DBNAME"),
  # ...
  minSize = 2, maxSize = 10
)
```

---

### 4. Missing Error Handling in Reactive Expressions

**Severity: HIGH**

Shiny module reactive expressions have no `tryCatch` guards. Example from `endpointsmodule.R`:

```r
selected_fhir_endpoints_without_limit <- reactive({
  tbl(db_connection, "selected_fhir_endpoints_mv") %>%
    filter(...) %>%
    collect()
  # No error handling — DB failure crashes the module silently
})
```

If a database query fails, the user sees a generic grey error screen. Wrap all database-dependent reactives in `tryCatch` and display user-friendly messages via `validate(need(...))`.

---

### 5. Global State via `<<-` Assignment

**Severity: MEDIUM**

`global.R` lines 52-61 use the super-assignment operator to create global reactive state:

```r
app <<- list(
  fhir_version_list_no_capstat = reactiveVal(NULL),
  fhir_version_list = reactiveVal(NULL),
  # ...
)
```

This creates implicit dependencies that are hard to trace, test, and debug. Prefer passing reactive values explicitly through module function arguments.

---

### 6. Pagination Logic Duplicated Across 4 Modules

**Severity: LOW**

Nearly identical pagination code (~60 lines) is repeated in:
- `endpointsmodule.R` lines 62-145
- `organizationsmodule.R` lines 61-112
- `securitymodule.R` lines 66-128
- `validationsmodule.R` lines 79-150

Each also hardcodes `page_size <- 10`. Extract to a shared `pagination_utils.R` module.

---

### 7. Debug Messages Left in Production Code

**Severity: LOW**

`global.R` contains debug logging that should be removed or gated behind a flag:

```r
message(sprintf("I am in observe session ******* %s", database_fetch()))
message("I am inside observe event ***")
```

---

### 8. Inefficient Data Collection

**Severity: MEDIUM**

`endpointsmodule.R` lines 68-77 compute total page count by collecting the entire dataset:

```r
table_data <- selected_fhir_endpoints_without_limit() %>%
  select(...) %>% distinct(...)
total_records <- nrow(table_data)
```

This forces R to pull all rows into memory just to count them. Use a SQL `COUNT(DISTINCT ...)` query instead.

Similarly, `dashboardmodule.R` lines 14-16 convert an entire table to a data frame before slicing:

```r
totals_data <- db_tables$mv_endpoint_totals %>%
  as.data.frame() %>%
  slice(1)
```

Call `slice(1)` before `as.data.frame()` (or better, use `head(1) %>% collect()`).

---

### 9. Outdated R Version and Packages

**Severity: MEDIUM**

`shinydashboard/renv.lock` targets R 3.6.3 (EOL May 2020). The Docker image uses `rocker/shiny-verse:4.1.3` (also outdated — current R is 4.3+). Package versions are similarly stale (DT 0.18 vs current 0.28+, RPostgres 1.3.2 vs 1.4.5+).

---

### 10. UI Strengths Worth Preserving

The front-end demonstrates several strong practices:
- ARIA labels on all font awesome icons for accessibility
- Critical CSS inlined with deferred loading for non-critical styles
- Environment-aware banner (`LANTERN_BANNER_TEXT`) for dev/staging distinction
- Materialized view usage for dashboard query performance
- 20MB memory cache with 1-hour TTL (`shinyOptions(cache = memoryCache(...))`)

---

## Go Backend Services

### 1. `panic()` and `log.Fatal()` in Production Paths

**Severity: HIGH**

Store initialization panics on connection failure instead of returning an error:

```go
// endpointmanager/pkg/endpointmanager/postgresql/store.go:34-43
if err != nil {
    err = fmt.Errorf("Error opening database: %s", err.Error())
    panic(err.Error())
}
```

The `FailOnError()` helper (`endpointmanager/pkg/helpers/helpers.go:82-90`) calls `log.Fatalf()` — used **398+ times** across the codebase:

```go
func FailOnError(errString string, err error) {
    if err != nil {
        log.Fatalf("%s", err)  // Immediate termination, no cleanup
    }
}
```

Both patterns terminate the process without running deferred cleanup, closing database connections, or draining message queues. Replace with proper error returns and handle errors at the call site.

---

### 2. No Graceful Shutdown

**Severity: HIGH**

Main functions block indefinitely with no signal handling:

```go
// capabilityreceiver/cmd/main.go:58-59
go setupVersionsReception(ctx, store)
setupCapStatReception(ctx, store)  // Blocks forever
```

```go
// capabilityquerier/cmd/main.go:174-178
go mq.ProcessMessages(ctx, messages, processFunc, &args, errs)
for elem := range errs {  // Never exits
    log.Warn(elem)
}
```

There is no `os.Signal` listener for `SIGTERM`/`SIGINT`. Docker sends `SIGTERM` on `docker stop`, so the process gets killed with no chance to finish in-flight work, close connections, or acknowledge messages.

**Fix:**
```go
ctx, cancel := context.WithCancel(context.Background())
sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
go func() { <-sigCh; cancel() }()
```

---

### 3. Go 1.16 is End-of-Life

**Severity: CRITICAL**

All `go.mod` files specify `go 1.16` (released Feb 2021, EOL April 2023). This means:
- No security patches for the Go runtime
- Missing generics (1.18+), structured logging in stdlib (1.21+), and many performance improvements
- Dependencies may stop supporting 1.16

**Recommendation:** Upgrade to Go 1.21+ minimum.

---

### 4. Type-Unsafe Handler Arguments

**Severity: MEDIUM**

The worker and message handler pattern uses `*map[string]interface{}` for passing arguments:

```go
// lanternmq/lanternmq.go
type MessageHandler func(context.Context, *map[string]interface{}, []byte) error

// capabilityquerier/cmd/main.go:46
qa, ok := (*args)["queryArgs"].(QuerierArgs)
if !ok {
    return fmt.Errorf("unable to cast queryArgs from arguments")
}
```

Every handler must do a runtime type assertion that can fail silently. With Go 1.18+ generics, this can be made type-safe:

```go
type MessageHandler[T any] func(context.Context, T, []byte) error
```

---

### 5. Global Prepared Statements

**Severity: MEDIUM**

`endpointmanager/pkg/endpointmanager/postgresql/historypruningstore.go` declares 20+ global prepared statement variables:

```go
var pruningStatementQueryInterval *sql.Stmt
var pruningStatementNoQueryInterval *sql.Stmt
var pruningStatementCustomQueryInterval *sql.Stmt
var pruningDeleteStatement *sql.Stmt
// ...
```

While technically thread-safe after initialization, this pattern:
- Makes testing harder (can't swap implementations)
- Creates implicit coupling to a single database connection
- Prevents proper cleanup

Attach prepared statements to the `Store` struct instead.

---

### 6. Missing Connection Pool Tuning

**Severity: MEDIUM**

```go
// endpointmanager/pkg/endpointmanager/postgresql/store.go:31
store.DB, err = sql.Open("postgres", psqlInfo)
```

No calls to `SetMaxOpenConns()`, `SetMaxIdleConns()`, or `SetConnMaxLifetime()`. The default Go `sql.DB` pool has unlimited open connections and 2 idle connections, which is rarely optimal.

---

### 7. Hardcoded Default Credentials

**Severity: MEDIUM**

`endpointmanager/pkg/config/config.go`:

```go
viper.SetDefault("dbpassword", "postgrespassword")
viper.SetDefault("qpassword", "capabilityquerier")
```

Even though these are overridden by environment variables, hardcoded defaults in source code are a liability (accidentally used in production, visible in version control).

---

### 8. Inconsistent Error Wrapping

**Severity: LOW**

The codebase mixes `fmt.Errorf`, `github.com/pkg/errors.Errorf`, and `errors.Wrap` inconsistently:

```go
// capabilityquerier/cmd/main.go:48
return fmt.Errorf("Error parsing message JSON: %s", err.Error())

// lanternmq/pkg/accessqueue/accessqueue.go:35
return nil, nil, errors.Errorf("queue %s does not exist", qName)
```

Standardize on Go 1.13+ `fmt.Errorf("...: %w", err)` for error wrapping.

---

### 9. Logging Not Structured

**Severity: LOW**

Logrus is used consistently, but mostly with simple string formatting:

```go
log.Infof("Error requesting versions response: %s", err.Error())
```

This misses logrus's key feature — structured fields:

```go
log.WithError(err).WithField("endpoint", url).Error("failed to query versions")
```

Also, error-level events are sometimes logged at Info level, making monitoring unreliable.

---

### 10. Code Duplication in Queue Setup

**Severity: LOW**

`capabilityreceiver/cmd/main.go` has two nearly identical functions for queue setup:

```go
func setupCapStatReception(ctx context.Context, store *postgresql.Store) { ... }
func setupVersionsReception(ctx context.Context, store *postgresql.Store) { ... }
```

The only differences are queue name and handler function — extract to a shared helper.

Configuration bindings in `config.go` are also duplicated (lines 68-85 contain repeated `viper.BindEnv()` calls).

---

### 11. Go Testing Strengths

The test suite is well-structured:
- Table-driven tests with custom `th.Assert()` helpers
- Mock message queue implementation (`lanternmq/mock/basicmock.go`)
- Build tag separation for unit/integration/e2e tests
- Good edge case coverage (context cancellation, error conditions)

**Gaps:** No benchmark tests, no fuzz tests, no property-based tests.

---

## R Plumber API

### 1. No Authentication or Rate Limiting

**Severity: HIGH**

All API endpoints are publicly accessible with no authentication:

```r
#* @get /daily/download
function(res) {
  res$setHeader("Content-Type", "text/csv")
  res$setHeader("Content-Disposition", "attachment; filename=fhir_endpoints.csv")
}
```

No API key, OAuth, or even basic auth. No rate limiting to prevent abuse.

---

### 2. Inconsistent Input Validation

**Severity: MEDIUM**

The organizations endpoint (`restendpoints.R` lines 19-127) has thorough input validation — checking FHIR versions, vendor names against the database, and returning 400 with descriptive errors. The daily download endpoint (lines 6-17) has none.

---

### 3. Credentials Baked into Docker Image

**Severity: CRITICAL**

`api/Dockerfile` passes database credentials as build arguments and writes them to the image:

```dockerfile
ARG LANTERN_DBNAME
ARG LANTERN_DBPASSWORD
# ...
RUN env | grep LANTERN > /home/plumber/.Renviron
```

These credentials are permanently stored in Docker image layers and extractable via `docker history`. Use runtime-mounted secrets instead.

---

### 4. No CORS Configuration

**Severity: MEDIUM**

`plumber.R` does not configure CORS. If the API is consumed by browser-based clients, requests will be blocked. If it's internal-only, CORS should be explicitly locked down.

---

### 5. No OpenAPI/Swagger Documentation

**Severity: LOW**

Plumber natively supports OpenAPI spec generation via `#* @param` and `#* @response` annotations. The current endpoints lack these annotations, missing an easy documentation win.

---

### 6. Good Patterns Worth Preserving

- `glue_sql()` used correctly in `downloadsmodule.R` for parameterized queries
- Proper HTTP status codes and descriptive error messages in organization endpoint
- Content-Disposition headers set correctly for CSV downloads

---

## Database

### 1. PostgreSQL 11.10 is End-of-Life

**Severity: CRITICAL**

PostgreSQL 11 reached EOL in November 2023. No security patches are available. The `docker-compose.yml` pins to `postgres:11.10`.

**Recommendation:** Upgrade to PostgreSQL 15.x or 16.x (supported through 2027-2028). Test with `pg_upgrade` or logical replication.

---

### 2. `synchronous_commit=off` Risks Data Loss

**Severity: HIGH**

`docker-compose.yml` line 7:

```yaml
command:
  - -csynchronous_commit=off
```

This means committed transactions can be lost on crash. For healthcare endpoint data that is expensive to re-collect, this is risky. Change to `local` or `on`.

---

### 3. Schema Column Typo

**Severity: LOW**

`db/sql/dbsetup.sql` line 161:

```sql
cerification_number VARCHAR(500)  -- Should be "certification_number"
```

The typo is used consistently and propagated through migrations, so it's functional but creates confusion.

---

### 4. Missing NOT NULL Constraints

**Severity: MEDIUM**

Several columns that participate in unique constraints or serve as de facto keys allow NULL:

- `fhir_endpoints.list_source` (line 174) — part of unique constraint (line 178) but nullable
- `fhir_endpoints_availability.url` (line 280) — part of the logical primary key
- `endpoint_organization.url` and `organization_npi_id` (lines 257-258)

---

### 5. Over-Indexing on JSONB Columns

**Severity: MEDIUM**

`dbsetup.sql` lines 435-494 create **66 separate JSONB path indexes** on `capability_statement`:

```sql
CREATE INDEX capstat_software_name_idx ON fhir_endpoints_info ...
CREATE INDEX capstat_software_version_idx ON fhir_endpoints_info ...
-- 64 more
```

Each index adds storage overhead and slows INSERT/UPDATE operations. Profile actual query patterns and keep only the indexes that are used. A GIN index on the full JSONB column may be more efficient than dozens of path-specific indexes.

---

### 6. Oversized Numeric Precision

**Severity: LOW**

`availability DECIMAL(64,4)` — a 64-digit decimal for a value between 0 and 1. `DECIMAL(5,4)` is sufficient and uses less storage.

---

### 7. Large Migrations Without Checkpoints

**Severity: MEDIUM**

- Migration 000055 (`add_HTI_1_organization_data`): **907 lines** of INSERT statements in a single transaction
- Migration 000070 (`recreate_mvs_to_add_fhir_versions`): **2,041 lines** recreating all materialized views
- Migration 000071 (`new_source_filter`): **1,300 lines**

These can timeout or cause extended locks. Break into smaller batches with progress checkpoints.

---

### 8. Migration Reversibility Bug

**Severity: MEDIUM**

Migration 000002's down script references the wrong table for trigger removal:

```sql
-- 000002_add_endpoint_availability.down.sql
DROP TRIGGER IF EXISTS update_fhir_endpoint_availability_trigger ON fhir_endpoints_info;
-- Actual trigger is on fhir_endpoints_metadata
```

This means rollback silently fails to clean up the trigger.

---

### 9. Materialized View Refresh Script Issues

**Severity: MEDIUM**

`scripts/refresh_materialized_views.sh`:

- **Hardcoded container name:** `docker exec -t lantern-back-end-postgres-1 psql...` — breaks if container is renamed or running outside Compose
- **Non-atomic index rebuild:** Drops and recreates unique indexes between refreshes, creating a race condition window
- **No timeout or failure recovery:** If `REFRESH CONCURRENTLY` hangs, the script blocks indefinitely with no alerting
- **Sequential execution:** 15+ views refreshed one at a time with no parallelism

---

### 10. Hardcoded Confidence Threshold

**Severity: LOW**

`dbsetup.sql` line 433, the `organization_location` view:

```sql
WHERE CONFIDENCE > 0.97
```

This magic number should be a configurable parameter or documented constant.

---

### 11. Database Strengths

- Well-normalized schema with proper foreign keys
- History table with trigger-based audit trail
- Materialized views for read-heavy dashboard queries
- Role-based access with `readonly` and `readwrite` groups
- All migrations wrapped in `BEGIN;...COMMIT;` for atomicity

---

## Infrastructure & DevOps

### 1. No Multi-Stage Docker Builds

**Severity: HIGH**

All Go Dockerfiles use a single-stage pattern:

```dockerfile
FROM golang:1.16
WORKDIR /go/src/app
COPY . .
RUN go build cmd/main.go
CMD ["./main"]
```

The final image includes the full Go toolchain, source code, and build artifacts (~900MB). A multi-stage build reduces this to ~20MB:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o main cmd/main.go

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/main /
CMD ["/main"]
```

---

### 2. All Containers Run as Root

**Severity: HIGH**

No Dockerfile includes a `USER` directive. All services run as root inside the container. A container escape or code execution vulnerability immediately grants root access.

**Fix:** Add to every Dockerfile:
```dockerfile
RUN adduser -D -u 1000 appuser
USER appuser
```

---

### 3. No Health Checks

**Severity: HIGH**

`docker-compose.yml` defines no `healthcheck` for any service. Services use `wait-for-it.sh` to check port availability, but this doesn't verify the service is actually functional.

**Fix:**
```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U lantern"]
    interval: 10s
    timeout: 5s
    retries: 5
```

---

### 4. No Resource Limits

**Severity: MEDIUM**

No `deploy.resources.limits` in docker-compose.yml. PostgreSQL and RabbitMQ can consume unbounded memory, potentially taking down the host.

---

### 5. Environment Variables Expose Credentials

**Severity: MEDIUM**

Passwords passed as plain environment variables in docker-compose.yml are visible via `docker inspect`:

```yaml
environment:
  - POSTGRES_PASSWORD=${LANTERN_DBPASSWORD}
  - LANTERN_DBPASSWORD=${LANTERN_DBPASSWORD}
```

Use Docker secrets or a secrets manager for sensitive values.

---

### 6. Unpinned RabbitMQ Version

**Severity: MEDIUM**

```yaml
lantern-mq:
  image: rabbitmq:3-management
```

The `3-management` tag is a floating tag that changes over time. Pin to a specific version (e.g., `rabbitmq:3.12.10-management`) for reproducible builds.

---

### 7. No Restart Limits

**Severity: LOW**

Services use `restart: on-failure` without a max retries limit, which can cause infinite restart loops:

```yaml
restart: on-failure  # Could restart forever
# Better:
restart: on-failure:5
```

---

### 8. CI/CD Gaps

**Severity: MEDIUM**

`.github/workflows/test.yml`:

- Uses `actions/checkout@v2` (deprecated — use `@v4`)
- No Go module caching (`actions/setup-go` with cache)
- No security scanning (SAST, dependency audit, container scanning)
- No test coverage reporting or badges
- No overall workflow timeout — tests can hang indefinitely
- Hardcoded test credentials visible in workflow file

---

### 9. Backup Strategy Incomplete

**Severity: MEDIUM**

`scripts/backup.sh`:

- No defined backup schedule or frequency
- No retention policy — `rm -f ${BACKUP_DIR}/*.sql` deletes all SQL files
- No backup verification (restore testing)
- No encryption for backup files
- Hardcoded container name
- Email notification continues even if backup failed

---

### 10. Operational Scripts Brittleness

**Severity: MEDIUM**

Multiple scripts (`refresh_materialized_views.sh`, `vacuum.sh`, `backup.sh`, `populatedb.sh`) share these issues:

- Hardcoded `docker exec lantern-back-end-postgres-1` — breaks outside default Compose setup
- `vacuum.sh` runs `VACUUM FULL` which acquires exclusive locks on 20+ tables
- `populatedb.sh` is not idempotent — re-runs create duplicate data
- No prerequisite checking (is the database up? is the container running?)

---

## Priority Action Plan

### Immediate (This Week)

| # | Issue | Impact |
|---|-------|--------|
| 1 | Fix SQL injection in `endpoints.R` | Security — exploitable vulnerability |
| 2 | Remove credentials from API Dockerfile layers | Security — credential exposure |
| 3 | Upgrade PostgreSQL from 11.10 to 15+ | Security — EOL, no patches |
| 4 | Upgrade Go from 1.16 to 1.21+ | Security — EOL, no patches |

### High Priority (Next Sprint)

| # | Issue | Impact |
|---|-------|--------|
| 5 | Implement multi-stage Docker builds | Ops — 45x image size reduction |
| 6 | Add non-root USER to all Dockerfiles | Security — container escape mitigation |
| 7 | Add health checks to docker-compose | Reliability — service availability |
| 8 | Implement DB connection pooling in Shiny | Reliability — concurrent user support |
| 9 | Add graceful shutdown (signal handling) to Go services | Reliability — clean restarts |
| 10 | Replace `panic()`/`log.Fatal()` with error returns | Reliability — resource cleanup |
| 11 | Add authentication to Plumber API | Security — public endpoint exposure |

### Medium Priority (Next 2 Sprints)

| # | Issue | Impact |
|---|-------|--------|
| 12 | Add `tryCatch` to Shiny reactive expressions | UX — user-friendly error messages |
| 13 | Migrate `callModule()` to `moduleServer()` | Maintainability — modern patterns |
| 14 | Fix migration 000002 down script | Reliability — safe rollback |
| 15 | Add CI security scanning and caching | DevOps — faster, safer builds |
| 16 | Set `synchronous_commit=local` | Reliability — data durability |
| 17 | Profile and reduce JSONB index count | Performance — write throughput |
| 18 | Pin RabbitMQ version, add resource limits | Ops — reproducibility |
| 19 | Implement backup retention and verification | Ops — disaster recovery |
| 20 | Add structured logging (logrus fields) | Observability — debugging |

### Low Priority (Ongoing)

| # | Issue | Impact |
|---|-------|--------|
| 21 | Extract shared pagination module in Shiny | Maintainability — DRY |
| 22 | Use Go generics for handler args | Type safety — fewer runtime errors |
| 23 | Standardize error wrapping (`%w`) | Consistency — error chain tracing |
| 24 | Remove debug `message()` calls from global.R | Code quality |
| 25 | Fix column typo `cerification_number` | Code quality |
| 26 | Add OpenAPI annotations to Plumber endpoints | Documentation |
| 27 | Parameterize hardcoded container names in scripts | Portability |
