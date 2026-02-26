package handlers

import (
	"net/http"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// HealthCheck returns database connectivity status.
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	err := h.db.PingContext(r.Context())
	if err != nil {
		models.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "error",
			"db":     "disconnected",
		})
		return
	}

	models.WriteJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"db":     "connected",
	})
}
