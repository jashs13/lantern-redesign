# CLAUDE.md - Lantern Backend

## Project Overview

Lantern is an open-source healthcare analytics platform developed by the Office of the National Coordinator (ONC) for Health Information Technology and Mettle Solutions LLC. It monitors FHIR API endpoints across US healthcare organizations, tracking endpoint availability, adoption metrics, and FHIR Capability Statements.

**Version:** 3.0.0
**License:** Apache 2.0 (with notice/attribution to Mettle Solutions LLC)

## Architecture

Microservices architecture using Go for backend services, R/Shiny for the web dashboard, R/Plumber for a REST API, PostgreSQL for persistence, and RabbitMQ for async messaging.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Endpoint Manager │────▶│    RabbitMQ       │◀────│  Capability      │
│ (Go)             │     │    (lanternmq)    │     │  Receiver (Go)   │
│ - populates DB   │     └────────┬──────────┘     │  - validates     │
│ - scrapes/links  │              │                │  - stores        │
└──────────────────┘     ┌────────▼──────────┐     └────────┬─────────┘
                         │ Capability        │              │
                         │ Querier (Go)      │              │
                         │ - queries FHIR    │              │
                         └───────────────────┘              │
                                                            │
┌──────────────────┐     ┌──────────────────┐     ┌────────▼─────────┐
│ Shiny Dashboard  │────▶│   PostgreSQL     │◀────│  Plumber API     │
│ (R, port 8090)   │     │   (port 5432)    │     │  (R, port 8989)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Data Flow:**
1. Endpoint Manager queries CHPL/NPPES/endpoint sources → populates DB → publishes to RabbitMQ
2. Capability Querier consumes queue → queries FHIR endpoints for Capability Statements → publishes results
3. Capability Receiver consumes queue → validates/parses → stores in PostgreSQL
4. Shiny Dashboard reads DB for visualizations; Plumber API serves data exports

## Directory Structure

```
├── api/                        # R Plumber REST API (port 8989)
│   └── download/plumber.R      # Entry point
├── capabilityquerier/          # Go service: queries FHIR Capability Statements
│   └── cmd/main.go             # Entry point
├── capabilityreceiver/         # Go service: processes capability statements
│   └── cmd/main.go             # Entry point
├── db/                         # Database setup and migrations
│   ├── sql/dbsetup.sql         # Schema setup
│   └── migration/migrations/   # 65+ numbered migration files (up/down)
├── e2e/                        # End-to-end integration tests (Go)
│   └── integration_tests/data_flow_test.go
├── endpointmanager/            # Go service: data capture and retrieval coordinator
│   └── cmd/main.go             # Entry point (multiple subcommands)
├── lanternmq/                  # Go RabbitMQ wrapper library
├── resources/                  # FHIR endpoint data
│   ├── prod_resources/         # Production vendor endpoint source files
│   └── dev_resources/          # Development endpoint source files
├── scripts/                    # Operational shell scripts
├── shinydashboard/             # R Shiny web dashboard (port 8090)
│   └── lantern/
│       ├── ui.R / server.R     # Entry points
│       ├── global.R            # App initialization
│       ├── modules/            # Feature modules
│       └── functions/          # Utility functions
├── docker-compose.yml          # Production config
├── docker-compose.override.yml # Development overrides
├── docker-compose.test.yml     # Test environment config
├── Makefile                    # Build and task automation
└── env.sample                  # Environment variables template
```

## Tech Stack

| Component             | Technology           | Version  |
|-----------------------|----------------------|----------|
| Backend services      | Go                   | 1.16     |
| Web dashboard         | R / Shiny            | 4.1.3    |
| REST API              | R / Plumber          | latest   |
| Database              | PostgreSQL           | 11.10    |
| Message queue         | RabbitMQ             | 3        |
| Containerization      | Docker / Compose     | —        |
| R dependency mgmt     | renv                 | 0.13.2   |
| Go dependency mgmt    | Go Modules           | —        |

## Development Setup

1. Copy `env.sample` to `.env` and configure values
2. Start development environment:
   ```bash
   make run
   ```
3. Populate the database:
   ```bash
   make populatedb
   ```

**Development ports exposed (via docker-compose.override.yml):**
- 3838 — Shiny Dashboard
- 8989 — Plumber API
- 5432 — PostgreSQL
- 5672 / 15672 — RabbitMQ / Management UI

**Stop services:**
```bash
make stop
```

**Clean (removes volumes):**
```bash
make clean
```

## Common Make Targets

### Run/Stop
| Command | Description |
|---------|-------------|
| `make run` | Start development environment |
| `make run_prod` | Start production environment |
| `make stop` / `make stop_prod` | Stop services |
| `make clean` / `make clean_remote` | Stop and remove volumes |

### Database
| Command | Description |
|---------|-------------|
| `make migrate_database` | Run DB migrations |
| `make populatedb` | Populate dev database |
| `make populatedb_prod` | Populate production database |
| `make backup_database` | Backup PostgreSQL |
| `make restore_database` | Restore from backup |
| `make create_archive` | Archive data by date range |
| `make history_pruning` | Prune old historical data |

### Testing
| Command | Description |
|---------|-------------|
| `make test` | Run unit tests (all Go modules) |
| `make test_int` | Run integration tests (requires services) |
| `make test_e2e` | Run end-to-end tests |
| `make test_all` | Run all test suites sequentially |

### Code Quality
| Command | Description |
|---------|-------------|
| `make lint` | Run all linters |
| `make lint_go` | golangci-lint for Go |
| `make lint_R` | lintr for R code |

### Data Export
| Command | Description |
|---------|-------------|
| `make csv_export` | Export endpoint data to CSV |
| `make chpl_report` | Generate CHPL compliance report |
| `make update_source_data` | Refresh endpoint sources (dev) |
| `make update_source_data_prod` | Refresh endpoint sources (prod) |

### Dependencies
| Command | Description |
|---------|-------------|
| `make update_mods` | Update Go module references |

## Go Module Structure

The project uses a multi-module Go workspace with local `replace` directives:

- **Root module** (`github.com/onc-healthit/lantern-back-end`) — shared utilities
- **endpointmanager** — endpoint population, CHPL queries, scraping, linking, exporting
- **capabilityquerier** — FHIR Capability Statement querying
- **capabilityreceiver** — capability statement validation and storage
- **lanternmq** — RabbitMQ wrapper/abstraction
- **e2e** — end-to-end test harness

Key Go dependencies: `logrus` (logging), `viper` (config), `lib/pq` (PostgreSQL), `streadway/amqp` (RabbitMQ), `chromedp` (headless Chrome), `goquery` (HTML parsing), `gonum` (numerical computation).

## Endpoint Manager Subcommands

The endpoint manager (`endpointmanager/cmd/main.go`) supports multiple subcommands:

| Subcommand | Purpose |
|------------|---------|
| `endpointpopulator` | Populate endpoints from source files |
| `chplquerier` | Query CHPL API for certified products |
| `medicareendpointquerier` | Query Medicare endpoints |
| `medicaidendpointquerier` | Query Medicaid endpoints |
| `endpointwebscraper` | Scrape endpoint URLs from websites |
| `endpointlinker` | Link endpoints to healthcare organizations |
| `CHPLpopulator` | Populate CHPL product data |
| `nppescontactpopulator` | Load NPPES contact data |
| `historypruning` | Prune historical data beyond threshold |
| `historycleanup` | Clean up duplicate history records |
| `datavalidation` | Validate datasets |
| `archivefile` | Create data archives |
| `endpointexporter` | Export data to CSV |
| `CHPLreport` | Generate CHPL compliance reports |

## Testing

### Unit Tests
- Located alongside source code as `*_test.go` files in each Go module
- Run: `make test`

### Integration Tests
- Files with `// +build integration` tag (`*_integration_test.go`)
- Require running PostgreSQL and RabbitMQ services
- Run: `make test_int`

### End-to-End Tests
- Located in `e2e/integration_tests/data_flow_test.go`
- Full system test with all services via `docker-compose.test.yml`
- Run: `make test_e2e`

### R Code Linting
- Uses `lintr` via `scripts/lintr.sh`
- Run: `make lint_R`

## CI/CD (GitHub Actions)

### `.github/workflows/test.yml` (on push to `main`)
- **test-unit**: Go 1.16 on ubuntu-22.04, runs `make test`
- **test-integration**: Starts Docker services, runs `make test_int`
- **test-e2e**: Full Docker environment, runs `make test_e2e_CI`

### `.github/workflows/static.yml`
- **Golintr**: golangci-lint v1.64.8, runs `make lint_go`
- **Rlintr**: R 4.1.3, runs `scripts/lintr.sh`

## Environment Variables

Key environment variables (see `env.sample` for full list):

| Variable | Purpose |
|----------|---------|
| `LANTERN_DBHOST/PORT/NAME/USER/PASSWORD` | PostgreSQL connection |
| `LANTERN_DBSSLMODE` | DB SSL mode (disable for dev) |
| `LANTERN_DBUSER_READONLY/READWRITE` | DB role-based access users |
| `LANTERN_QHOST/PORT/USER/PASSWORD` | RabbitMQ connection |
| `LANTERN_CHPLAPIKEY` | CHPL API key |
| `LANTERN_1UP_CLIENT_ID/SECRET` | 1Up Health API credentials |
| `LANTERN_QUERY_NUMWORKERS` | Capability query worker pool size |
| `LANTERN_CAPQUERY_QRYINTVL` | Query interval in minutes |
| `LANTERN_EXPORT_NUMWORKERS` | CSV export worker count |
| `LANTERN_EXPORT_DURATION` | Export duration limit |
| `LANTERN_PRUNING_THRESHOLD` | History pruning threshold (hours) |

## Database

- **Engine:** PostgreSQL 11.10
- **Schema:** `db/sql/dbsetup.sql`
- **User setup:** `db/sql/dbusersetup.sql` (prod) / `dbusersetup_dev.sql` (dev)
- **Migrations:** `db/migration/migrations/` — 65+ numbered up/down SQL files
- **Materialized views** refreshed via `scripts/refresh_materialized_views.sh`

## Conventions

- Go services follow standard `cmd/main.go` entry point pattern
- Go build tags separate unit (`default`), integration (`integration`), and e2e (`e2e`) tests
- R Shiny app uses modular structure under `shinydashboard/lantern/modules/`
- All services are containerized with individual Dockerfiles
- Environment config via `.env` file (never committed — use `env.sample` as template)
- Resource/vendor data files stored in `resources/` with separate dev/prod directories
