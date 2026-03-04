package router

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/onc-healthit/lantern-back-end/api/internal/config"
	"github.com/onc-healthit/lantern-back-end/api/internal/handlers"
	"github.com/onc-healthit/lantern-back-end/api/internal/middleware"
)

// New creates and configures the chi router with all routes and middleware.
func New(db *sql.DB, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	// Middleware stack
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		ExposedHeaders:   []string{"Content-Disposition"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	r.Use(middleware.CacheControl)

	rl := middleware.NewRateLimiter(100, 100) // 100 req/min per IP
	r.Use(rl.Handler)

	h := handlers.New(db)

	// Health check (outside /api/v1 prefix)
	r.Get("/healthz", h.HealthCheck)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Endpoints
		r.Get("/endpoints", h.ListEndpoints)
		r.Get("/endpoints/count", h.CountEndpoints)
		r.Get("/endpoints/{url}/details", h.EndpointDetails)
		r.Get("/endpoints/{url}/response-time", h.EndpointResponseTime)
		r.Get("/endpoints/{url}/http-history", h.EndpointHTTPHistory)

		// Dashboard
		r.Get("/dashboard/summary", h.DashboardSummary)

		// Organizations
		r.Get("/organizations", h.ListOrganizations)
		r.Get("/organizations/count", h.CountOrganizations)

		// Search
		r.Get("/search", h.Search)

		// Resources
		r.Get("/resources", h.ListResources)
		r.Get("/resources/chart", h.ResourcesChart)

		// Implementation Guides
		r.Get("/implementation-guides", h.ImplementationGuides)

		// Fields
		r.Get("/fields", h.ListFields)
		r.Get("/field-values", h.FieldValues)

		// Profiles
		r.Get("/profiles", h.ListProfiles)

		// CapStat Sizes
		r.Get("/capstat-sizes", h.CapStatSizes)

		// Validations
		r.Get("/validations/summary", h.ValidationsSummary)
		r.Get("/validations/details", h.ValidationsDetails)
		r.Get("/validations/failures", h.ValidationsFailures)

		// Security
		r.Get("/security", h.ListSecurity)
		r.Get("/security/summary", h.SecuritySummary)

		// SMART Response
		r.Get("/smart-response", h.SmartResponse)
		r.Get("/smart-response/summary", h.SmartResponseSummary)

		// Contacts
		r.Get("/contacts", h.ListContacts)

		// Filters
		r.Get("/filters/vendors", h.FilterVendors)
		r.Get("/filters/fhir-versions", h.FilterFHIRVersions)
		r.Get("/filters/fhir-version-groups", h.FilterFHIRVersionGroups)
		r.Get("/filters/resources", h.FilterResources)
		r.Get("/filters/operations", h.FilterOperations)
		r.Get("/filters/auth-types", h.FilterAuthTypes)
		r.Get("/filters/profiles", h.FilterProfiles)
		r.Get("/filters/validation-groups", h.FilterValidationGroups)
		r.Get("/filters/states", h.FilterStates)

		// Downloads
		r.Get("/downloads/endpoints.csv", h.DownloadEndpointsCSV)
		r.Get("/downloads/organizations.csv", h.DownloadOrganizationsCSV)
	})

	return r
}
