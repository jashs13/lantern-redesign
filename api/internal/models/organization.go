package models

// Organization represents a row from the organizations query.
type Organization struct {
	OrganizationName string  `json:"organization_name"`
	IdentifierType   *string `json:"identifier_type"`
	IdentifierValue  *string `json:"identifier_value"`
	Address          *string `json:"address"`
	OrgURL           *string `json:"org_url"`
	EndpointURL      *string `json:"endpoint_url"`
	FHIRVersion      *string `json:"fhir_version"`
	VendorName       *string `json:"vendor_name"`
}
