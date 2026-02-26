package handlers

import "database/sql"

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	db *sql.DB
}

// New creates a new Handler.
func New(db *sql.DB) *Handler {
	return &Handler{db: db}
}
