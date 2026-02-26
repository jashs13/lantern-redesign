package handlers

import (
	"fmt"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/onc-healthit/lantern-back-end/api/internal/models"
)

// ListContacts returns paginated contact data from mv_contacts_info.
func (h *Handler) ListContacts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, pageSize := models.ParsePagination(r)
	q := r.URL.Query()

	var conditions []string
	var args []any
	argIdx := 1

	if fv := q.Get("fhir_versions"); fv != "" {
		versions := models.ExpandVersionGroups(strings.Split(fv, ","))
		conditions = append(conditions, fmt.Sprintf("fhir_version = ANY($%d::text[])", argIdx))
		args = append(args, pqStringArray(versions))
		argIdx++
	}

	if vendor := q.Get("vendor"); vendor != "" {
		conditions = append(conditions, fmt.Sprintf("vendor_name = $%d", argIdx))
		args = append(args, vendor)
		argIdx++
	}

	if hasContact := q.Get("has_contact"); hasContact != "" {
		switch strings.ToLower(hasContact) {
		case "true":
			conditions = append(conditions, "contact_name IS NOT NULL")
		case "false":
			conditions = append(conditions, "contact_name IS NULL")
		}
	}

	if search := q.Get("search"); search != "" {
		pattern := "%" + search + "%"
		conditions = append(conditions, fmt.Sprintf(
			"(url ILIKE $%d OR vendor_name ILIKE $%d OR contact_name ILIKE $%d OR contact_value ILIKE $%d)",
			argIdx, argIdx, argIdx, argIdx))
		args = append(args, pattern)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var totalCount int
	h.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM mv_contacts_info %s", whereClause),
		args...).Scan(&totalCount)

	dataQuery := fmt.Sprintf(
		`SELECT url, vendor_name, fhir_version, contact_name, contact_type, contact_value
		 FROM mv_contacts_info %s
		 ORDER BY url
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, models.Offset(page, pageSize))

	rows, err := h.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		log.WithError(err).Error("querying contacts")
		models.WriteError(w, http.StatusInternalServerError, "failed to fetch contacts")
		return
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var c models.Contact
		if err := rows.Scan(&c.URL, &c.VendorName, &c.FHIRVersion,
			&c.ContactName, &c.ContactType, &c.ContactValue); err != nil {
			continue
		}
		contacts = append(contacts, c)
	}
	if contacts == nil {
		contacts = []models.Contact{}
	}

	resp := models.PaginatedResponse[models.Contact]{
		Data:       contacts,
		Pagination: models.NewPagination(page, pageSize, totalCount),
	}
	models.WriteJSON(w, http.StatusOK, resp)
}
