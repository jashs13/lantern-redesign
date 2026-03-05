/* ========================================================================== */
/* Navigation                                                                  */
/* ========================================================================== */

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

/**
 * Top navigation bar — primary links always visible.
 */
export const TOP_NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Endpoints', path: '/endpoints' },
  { label: 'Organizations', path: '/organizations' },
  { label: 'Resources', path: '/resources' },
  { label: 'Security', path: '/security' },
  { label: 'SMART Response', path: '/smart-response' },
];

/**
 * Overflow navigation — shown in a "More" dropdown.
 */
export const MORE_NAV_ITEMS: NavItem[] = [
  { label: 'Implementation Guides', path: '/implementation-guides' },
  { label: 'Fields', path: '/fields' },
  { label: 'Profiles', path: '/profiles' },
  { label: 'CapStat Size', path: '/capstat-size' },
  { label: 'Validations', path: '/validations' },
  { label: 'Contacts', path: '/contacts' },
  { label: 'Downloads/API', path: '/downloads' },
];

/**
 * All navigation items combined (for breadcrumb / title lookups).
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  ...TOP_NAV_ITEMS,
  ...MORE_NAV_ITEMS,
  { label: 'About', path: '/about' },
];

/* ========================================================================== */
/* FHIR Versions                                                               */
/* ========================================================================== */

/**
 * FHIR version groups — ported from api/internal/models/fhirversions.go
 * and shinydashboard/lantern/global.R (lines 37-41).
 */
export const FHIR_VERSION_GROUPS: Record<string, string[]> = {
  DSTU2: ['0.4.0', '0.5.0', '1.0.0', '1.0.1', '1.0.2'],
  STU3: ['1.1.0', '1.2.0', '1.4.0', '1.6.0', '1.8.0', '3.0.0', '3.0.1', '3.0.2'],
  R4: ['3.2.0', '3.3.0', '3.5.0', '3.5a.0', '4.0.0', '4.0.1'],
  R4B: ['4.1.0', '4.3.0'],
  R5: ['4.2.0', '4.4.0', '4.5.0', '4.6.0', '5.0.0'],
};

/** Ordered list of version group names for UI display. */
export const FHIR_VERSION_GROUP_NAMES = ['DSTU2', 'STU3', 'R4', 'R4B', 'R5'] as const;

/* ========================================================================== */
/* Colors                                                                      */
/* ========================================================================== */

/** Government Navy brand colors. */
export const NAVY_COLORS = {
  primaryDarkest: '#0a1628',
  primaryDark: '#112e51',
  primary: '#205493',
  primaryLight: '#4773aa',
  primaryLighter: '#8ba6ca',
  secondary: '#02bfe7',
  secondaryDark: '#0095c8',
} as const;

/** Status indicator colors (availability). */
export const STATUS_COLORS = {
  available: '#2e8540',
  degraded: '#fdb81e',
  down: '#e31c3d',
  unknown: '#5b616b',
} as const;

/** HTTP response code group colors. */
export const HTTP_STATUS_COLORS = {
  '2xx': { color: '#2e8540', bg: '#e7f4e9', label: 'Success' },
  '3xx': { color: '#205493', bg: '#e8f0f8', label: 'Redirect' },
  '4xx': { color: '#b56a00', bg: '#fff3e0', label: 'Client Error' },
  '5xx': { color: '#b51b35', bg: '#fbe9ec', label: 'Server Error' },
  timeout: { color: '#5b616b', bg: '#f1f1f1', label: 'Timeout' },
} as const;

/** Chart color palette for vendor/FHIR stacked bars. */
export const CHART_COLORS = [
  '#205493',
  '#02bfe7',
  '#2e8540',
  '#fdb81e',
  '#b56a00',
  '#e31c3d',
  '#4773aa',
  '#8ba6ca',
  '#4aa564',
  '#0095c8',
  '#b51b35',
  '#5b616b',
] as const;

/* ========================================================================== */
/* Pagination                                                                  */
/* ========================================================================== */

/** Default page sizes for paginated tables. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/* ========================================================================== */
/* Quick filter presets (Endpoints page)                                        */
/* ========================================================================== */

export interface QuickFilterPreset {
  label: string;
  key: string;
  params: Record<string, string>;
}

export const QUICK_FILTER_PRESETS: QuickFilterPreset[] = [
  { label: 'Available Only', key: 'available', params: { status: 'Available' } },
  { label: '>99% Uptime', key: 'high-uptime', params: { min_uptime: '99' } },
  { label: '<500ms Response', key: 'fast-response', params: { max_response_time: '0.5' } },
  { label: 'FHIR R4', key: 'fhir-r4', params: { fhir_version: 'R4' } },
  { label: 'Compliant', key: 'compliant', params: { compliant: 'true' } },
];
