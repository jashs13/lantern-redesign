export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavItem[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Sidebar navigation sections — grouped links for the left sidebar.
 * Structure and icon ids mirror lanterndashboardmockupv2.html exactly.
 */
export const SIDEBAR_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      { label: 'Endpoints', path: '/endpoints', icon: 'endpoints' },
      { label: 'Organizations', path: '/organizations', icon: 'organizations' },
    ],
  },
  {
    label: 'Capabilities',
    items: [
      { label: 'Resources', path: '/resources', icon: 'resources' },
      { label: 'Implementation Guides', path: '/implementation-guides', icon: 'ig' },
      { label: 'Profiles', path: '/profiles', icon: 'profiles' },
      {
        label: 'Capability Statements',
        path: '/capstat-fields',
        icon: 'capstat',
        children: [
          { label: 'Fields', path: '/capstat-fields' },
          { label: 'Field Values', path: '/capstat-values' },
          { label: 'Statement Sizes', path: '/capstat-size' },
          { label: 'Validations', path: '/validations' },
        ],
      },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Authorization Types', path: '/security', icon: 'authTypes' },
      { label: 'SMART on FHIR', path: '/smart-response', icon: 'smart' },
    ],
  },
  {
    items: [
      { label: 'Contacts', path: '/contacts', icon: 'contacts' },
      { label: 'Downloads & API', path: '/downloads', icon: 'downloads' },
      { label: 'About', path: '/about', icon: 'about' },
    ],
  },
];

/**
 * All navigation items combined (for breadcrumb / title lookups).
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  ...SIDEBAR_NAV_SECTIONS.flatMap((section) => section.items.flatMap((item) => item.children ?? item)),
  { label: 'Capabilities', path: '/capabilities' },
  { label: 'Conformance & Validation', path: '/conformance-validation' },
  { label: 'Search', path: '/search' },
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
/* Design tokens                                                               */
/* ========================================================================== */
/*
 * Single source of truth is the CSS custom properties in src/index.css.
 * getToken() reads a token's live value for plain DOM contexts (style props),
 * TOKENS is a concrete-hex mirror for contexts that can't resolve var() at
 * render time (Recharts fill/stroke SVG attributes). Keep TOKENS in sync with
 * the :root block in index.css.
 */

/** Reads a CSS custom property's current value off :root, e.g. getToken('color-primary'). */
export function getToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

/** Concrete hex mirror of the :root tokens in index.css — for chart (Recharts) usage. */
export const TOKENS = {
  blue50: '#f7f8fc',
  blue100: '#e9edfb',
  blue200: '#cdd7f5',
  blue300: '#93a5e8',
  blue400: '#7588de',
  blue500: '#586cd3',
  blue600: '#3a4fc9',
  blue700: '#1c32be',
  blue800: '#06179f',
  blue900: '#0e1f75',
  blue950: '#0b195e',
  secondary: '#02bfe7',
  secondaryDark: '#0095c8',
  success: '#2e8540',
  gold: '#f7c951',
  goldTextMuted: '#b8860b',
  error: '#e31c3d',
  timeout: '#5b616b',
} as const;

/** Status indicator colors (availability) — concrete hex for chart fills. */
export const STATUS_TOKENS = {
  available: TOKENS.success,
  degraded: TOKENS.gold,
  down: TOKENS.error,
  unknown: TOKENS.timeout,
} as const;

/** HTTP response code group colors — concrete hex for chart fills. */
export const HTTP_STATUS_TOKENS = {
  '2xx': { color: TOKENS.success, bg: '#e7f4e9', label: 'Success' },
  '3xx': { color: TOKENS.blue700, bg: TOKENS.blue100, label: 'Redirect' },
  '4xx': { color: '#b56a00', bg: '#fff3e0', label: 'Client Error' },
  '5xx': { color: '#b51b35', bg: '#fbe9ec', label: 'Server Error' },
  timeout: { color: TOKENS.timeout, bg: '#f1f1f1', label: 'Timeout' },
} as const;

/** Chart color palette for vendor/FHIR stacked bars — CVD-validated order. */
export const CHART_COLORS = ['#2e6fbe', '#1B5A7F', '#4aa564', '#b56a00'] as const;

/** Sequential single-hue ramp (blue-200 → blue-700) for charts needing more than 4 series. */
export const CHART_SEQUENTIAL_BLUE = [
  TOKENS.blue200,
  TOKENS.blue300,
  TOKENS.blue400,
  TOKENS.blue500,
  TOKENS.blue600,
  TOKENS.blue700,
] as const;

/* ========================================================================== */
/* Pagination                                                                  */
/* ========================================================================== */

/** Default page sizes for paginated tables. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

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
