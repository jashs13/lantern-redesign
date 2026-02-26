package models

// FHIR version groupings ported from shinydashboard/lantern/global.R lines 37-41.
var (
	DSTU2Versions = []string{"0.4.0", "0.5.0", "1.0.0", "1.0.1", "1.0.2"}
	STU3Versions  = []string{"1.1.0", "1.2.0", "1.4.0", "1.6.0", "1.8.0", "3.0.0", "3.0.1", "3.0.2"}
	R4Versions    = []string{"3.2.0", "3.3.0", "3.5.0", "3.5a.0", "4.0.0", "4.0.1"}
	R4BVersions   = []string{"4.1.0", "4.3.0"}
	R5Versions    = []string{"4.2.0", "4.4.0", "4.5.0", "4.6.0", "5.0.0"}
)

// VersionGroupMap maps a group name to its constituent versions.
var VersionGroupMap = map[string][]string{
	"DSTU2": DSTU2Versions,
	"STU3":  STU3Versions,
	"R4":    R4Versions,
	"R4B":   R4BVersions,
	"R5":    R5Versions,
}

// AllValidFHIRVersions returns every recognized FHIR version string.
func AllValidFHIRVersions() []string {
	var all []string
	all = append(all, DSTU2Versions...)
	all = append(all, STU3Versions...)
	all = append(all, R4Versions...)
	all = append(all, R4BVersions...)
	all = append(all, R5Versions...)
	return all
}

// ExpandVersionGroups expands group names (e.g., "R4") into individual versions
// and passes through individual versions unchanged.
func ExpandVersionGroups(versions []string) []string {
	var expanded []string
	for _, v := range versions {
		if group, ok := VersionGroupMap[v]; ok {
			expanded = append(expanded, group...)
		} else {
			expanded = append(expanded, v)
		}
	}
	return expanded
}
