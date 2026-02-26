/**
 * Mock API server for Lantern frontend development.
 *
 * Runs on port 8080 and returns realistic mock data for all API endpoints
 * so the frontend can be developed/tested without the full Go backend.
 *
 * Usage:  node mock-api.cjs
 */

const http = require('http');
const url = require('url');

const PORT = 8080;

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

const VENDORS = [
  'Epic Systems', 'Cerner/Oracle', 'Allscripts', 'athenahealth',
  'eClinicalWorks', 'Meditech', 'NextGen Healthcare', 'DrChrono',
  'Greenway Health', 'Veradigm', 'ModivCare', 'CareEvolution',
];

const FHIR_VERSIONS = ['4.0.1', '4.0.0', '3.0.2', '3.0.1', '1.0.2'];

const STATES = [
  'California', 'Texas', 'New York', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan',
];

const CITIES = [
  'San Francisco, CA', 'Houston, TX', 'New York, NY', 'Miami, FL',
  'Chicago, IL', 'Philadelphia, PA', 'Columbus, OH', 'Atlanta, GA',
  'Charlotte, NC', 'Detroit, MI', 'Boston, MA', 'Seattle, WA',
  'Denver, CO', 'Nashville, TN', 'Portland, OR',
];

const ORG_NAMES = [
  'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins Medicine',
  'Kaiser Permanente', 'Partners Healthcare', 'UCSF Health',
  'Mount Sinai Health System', 'NYU Langone Health',
  'Cedars-Sinai Medical Center', 'Duke University Health System',
  'University of Michigan Health', 'Mass General Brigham',
  'Stanford Health Care', 'Intermountain Healthcare',
  'Geisinger Health', 'Ochsner Health', 'Atrium Health',
  'Advocate Aurora Health', 'Northwell Health', 'HCA Healthcare',
  'CommonSpirit Health', 'Providence St. Joseph Health',
  'Trinity Health', 'Baylor Scott & White Health',
  'Memorial Hermann Health System',
];

const SECURITY_CODES = ['SMART-on-FHIR', 'OAuth2', 'Basic', 'Bearer', 'OpenID Connect'];
const SECURITY_SYSTEMS = [
  'http://hl7.org/fhir/restful-security-service',
  'http://terminology.hl7.org/CodeSystem/restful-security-service',
];

const RESOURCE_TYPES = [
  'Patient', 'Observation', 'Condition', 'MedicationRequest',
  'Encounter', 'Procedure', 'DiagnosticReport', 'Immunization',
  'AllergyIntolerance', 'CarePlan', 'CareTeam', 'Goal',
  'DocumentReference', 'Practitioner', 'Organization', 'Location',
  'ExplanationOfBenefit', 'Coverage', 'Claim', 'Device',
];

const FIELD_NAMES = [
  'Patient.name', 'Patient.birthDate', 'Patient.gender',
  'Observation.code', 'Observation.value', 'Observation.status',
  'Condition.code', 'Condition.clinicalStatus', 'Condition.onsetDateTime',
  'MedicationRequest.medication', 'MedicationRequest.status',
  'Encounter.class', 'Encounter.type', 'Encounter.period',
  'Procedure.code', 'Procedure.performedDateTime',
];

const PROFILE_NAMES = [
  'US Core Patient Profile', 'US Core Observation Profile',
  'US Core Condition Profile', 'US Core MedicationRequest Profile',
  'US Core Encounter Profile', 'US Core Procedure Profile',
  'US Core DiagnosticReport Profile', 'US Core Immunization Profile',
  'US Core AllergyIntolerance Profile', 'US Core CarePlan Profile',
];

const IG_NAMES = [
  'US Core Implementation Guide', 'SMART App Launch',
  'Bulk Data Access (Flat FHIR)', 'Da Vinci PDex',
  'Da Vinci HRex', 'C-CDA on FHIR', 'CARIN Blue Button',
  'Argonaut Data Query', 'Da Vinci Alerts', 'mCODE',
];

const VALIDATION_RULES = [
  { rule_name: 'TLS Version Check', description: 'Validates endpoint uses TLS 1.2 or higher' },
  { rule_name: 'Capability Statement Present', description: 'Verifies endpoint returns a valid CapabilityStatement' },
  { rule_name: 'FHIR Version Declared', description: 'Checks that FHIR version is declared in CapabilityStatement' },
  { rule_name: 'JSON Format Support', description: 'Validates endpoint supports application/fhir+json' },
  { rule_name: 'Patient Resource Available', description: 'Checks if Patient resource type is supported' },
  { rule_name: 'Security Declaration', description: 'Validates security section is present in CapabilityStatement' },
  { rule_name: 'SMART Configuration', description: 'Checks for SMART on FHIR security extensions' },
  { rule_name: 'OAuth2 Endpoints', description: 'Validates OAuth2 authorize and token endpoints are declared' },
];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max, dec) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec || 2)); }
function randomItem(arr) { return arr[randomInt(0, arr.length - 1)]; }
function randomNPI() { return String(randomInt(1000000000, 9999999999)); }

function generateEndpoint(i) {
  const vendor = randomItem(VENDORS);
  const fhir = randomItem(FHIR_VERSIONS);
  const httpCode = Math.random() > 0.05 ? 200 : randomItem([404, 500, 503]);
  return {
    url: `https://fhir.${vendor.toLowerCase().replace(/[^a-z]/g, '')}.com/api/FHIR/R4/endpoint${i}`,
    endpoint_names: `${vendor} Production FHIR Endpoint`,
    vendor_name: vendor,
    list_source: randomItem(['CMS', 'CHPL', 'Manual']),
    capability_fhir_version: fhir,
    fhir_version: fhir,
    format: 'application/fhir+json',
    http_response: httpCode,
    response_time_seconds: httpCode === 200 ? randomFloat(0.05, 2.5, 3) : null,
    smart_http_response: Math.random() > 0.3 ? 200 : randomItem([404, null]),
    errors: httpCode !== 200 ? 'Connection timeout' : null,
    availability: httpCode === 200 ? randomFloat(95, 99.99, 2) : randomFloat(0, 50, 2),
    kind: 'instance',
    requested_fhir_version: fhir,
    is_chpl: Math.random() > 0.3 ? 'true' : 'false',
    status: httpCode === 200 ? 'Active' : 'Inactive',
    cap_stat_exists: httpCode === 200 ? 'true' : 'false',
  };
}

function generateOrganization(i) {
  const name = i < ORG_NAMES.length ? ORG_NAMES[i] : `Healthcare Organization ${i + 1}`;
  return {
    organization_name: name,
    identifier_type: 'NPI',
    identifier_value: randomNPI(),
    address: randomItem(CITIES),
    org_url: `https://www.${name.toLowerCase().replace(/[^a-z]/g, '')}.org`,
    endpoint_url: `https://fhir.${name.toLowerCase().replace(/[^a-z]/g, '')}.org/api/FHIR/R4`,
    fhir_version: randomItem(FHIR_VERSIONS),
    vendor_name: randomItem(VENDORS),
  };
}

// Pre-generate large datasets
const ALL_ENDPOINTS = Array.from({ length: 200 }, (_, i) => generateEndpoint(i));
const ALL_ORGANIZATIONS = Array.from({ length: 100 }, (_, i) => generateOrganization(i));

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function parseQuery(reqUrl) {
  const parsed = url.parse(reqUrl, true);
  return { path: parsed.pathname, query: parsed.query };
}

function paginate(data, query) {
  const page = parseInt(query.page) || 1;
  const pageSize = parseInt(query.page_size) || 25;
  const start = (page - 1) * pageSize;
  const sliced = data.slice(start, start + pageSize);
  return {
    data: sliced,
    pagination: {
      page,
      page_size: pageSize,
      total_count: data.length,
      total_pages: Math.ceil(data.length / pageSize),
    },
  };
}

function searchFilter(data, query, fields) {
  const search = (query.search || query.q || '').toLowerCase();
  if (!search) return data;
  return data.filter(item =>
    fields.some(f => item[f] && String(item[f]).toLowerCase().includes(search))
  );
}

const handlers = {
  '/api/v1/dashboard/summary': (_query) => {
    const totalEndpoints = 70234;
    const http200 = 68540;
    return {
      totals: {
        all_endpoints: totalEndpoints,
        indexed_endpoints: 65000,
        non_indexed_endpoints: 5234,
        last_updated: new Date().toISOString().split('T')[0],
      },
      response_tally: {
        http_200: http200,
        http_404: 892,
        http_503: 312,
      },
      vendor_counts: VENDORS.flatMap(vendor =>
        FHIR_VERSIONS.slice(0, 3).map(fhir => ({
          vendor_name: vendor,
          fhir_version: fhir,
          count: randomInt(200, 8000),
          sort_order: VENDORS.indexOf(vendor),
        }))
      ),
      http_codes: [
        { http_code: 200, code_label: 'OK', count_endpoints: http200 },
        { http_code: 301, code_label: 'Moved Permanently', count_endpoints: 245 },
        { http_code: 302, code_label: 'Found', count_endpoints: 112 },
        { http_code: 400, code_label: 'Bad Request', count_endpoints: 56 },
        { http_code: 401, code_label: 'Unauthorized', count_endpoints: 178 },
        { http_code: 403, code_label: 'Forbidden', count_endpoints: 89 },
        { http_code: 404, code_label: 'Not Found', count_endpoints: 892 },
        { http_code: 500, code_label: 'Internal Server Error', count_endpoints: 312 },
        { http_code: 502, code_label: 'Bad Gateway', count_endpoints: 45 },
        { http_code: 503, code_label: 'Service Unavailable', count_endpoints: 167 },
      ],
    };
  },

  '/api/v1/endpoints': (query) => {
    let data = [...ALL_ENDPOINTS];
    data = searchFilter(data, query, ['url', 'endpoint_names', 'vendor_name']);
    if (query.vendor) data = data.filter(e => e.vendor_name === query.vendor);
    if (query.fhir_versions) {
      const versions = query.fhir_versions.split(',');
      data = data.filter(e => versions.some(v => e.fhir_version && e.fhir_version.startsWith(v)));
    }
    if (query.sort_by) {
      const dir = query.sort_dir === 'desc' ? -1 : 1;
      data.sort((a, b) => {
        const av = a[query.sort_by], bv = b[query.sort_by];
        if (av == null) return 1;
        if (bv == null) return -1;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }
    return paginate(data, query);
  },

  '/api/v1/organizations': (query) => {
    let data = [...ALL_ORGANIZATIONS];
    data = searchFilter(data, query, ['organization_name', 'identifier_value', 'address']);
    if (query.vendor) data = data.filter(o => o.vendor_name === query.vendor);
    return paginate(data, query);
  },

  '/api/v1/resources': (query) => {
    const data = RESOURCE_TYPES.flatMap(rt =>
      FHIR_VERSIONS.slice(0, 3).map(fv => ({
        resource_type: rt,
        fhir_version: fv,
        endpoint_count: randomInt(5000, 60000),
      }))
    );
    return paginate(data, query);
  },

  '/api/v1/resources/chart': (_query) => {
    return RESOURCE_TYPES.slice(0, 10).map(rt => ({
      resource_type: rt,
      fhir_version: '4.0.1',
      endpoint_count: randomInt(20000, 65000),
    }));
  },

  '/api/v1/security': (query) => {
    const data = ALL_ENDPOINTS.slice(0, 80).map(e => ({
      url: e.url,
      vendor_name: e.vendor_name,
      fhir_version: e.fhir_version,
      security_code: randomItem(SECURITY_CODES),
      security_system: randomItem(SECURITY_SYSTEMS),
    }));
    const filtered = searchFilter(data, query, ['url', 'vendor_name', 'security_code']);
    return paginate(filtered, query);
  },

  '/api/v1/smart-response': (query) => {
    const data = ALL_ENDPOINTS.slice(0, 80).map(e => ({
      url: e.url,
      vendor_name: e.vendor_name,
      fhir_version: e.fhir_version,
      smart_http_response: e.smart_http_response,
    }));
    const filtered = searchFilter(data, query, ['url', 'vendor_name']);
    return paginate(filtered, query);
  },

  '/api/v1/smart-response/summary': (_query) => ({
    well_known_summary: VENDORS.slice(0, 6).map(v => ({
      vendor_name: v,
      fhir_version: '4.0.1',
      http_200_count: randomInt(500, 5000),
      total_count: randomInt(5000, 8000),
    })),
    capability_counts: [
      { capability: 'launch-ehr', count: randomInt(30000, 50000) },
      { capability: 'launch-standalone', count: randomInt(25000, 45000) },
      { capability: 'client-public', count: randomInt(20000, 40000) },
      { capability: 'client-confidential-symmetric', count: randomInt(15000, 35000) },
      { capability: 'sso-openid-connect', count: randomInt(10000, 30000) },
      { capability: 'permission-offline', count: randomInt(8000, 25000) },
      { capability: 'permission-patient', count: randomInt(25000, 45000) },
      { capability: 'permission-user', count: randomInt(20000, 40000) },
    ],
  }),

  '/api/v1/contacts': (query) => {
    const data = ALL_ENDPOINTS.slice(0, 60).map(e => ({
      url: e.url,
      vendor_name: e.vendor_name,
      fhir_version: e.fhir_version,
      contact_name: `${randomItem(['IT Support', 'FHIR Team', 'API Support', 'Integration Team'])}`,
      contact_type: randomItem(['email', 'phone', 'url']),
      contact_value: randomItem([
        'support@example.com', 'fhir@example.org',
        '1-800-555-0100', 'https://support.example.com',
      ]),
    }));
    const filtered = searchFilter(data, query, ['url', 'vendor_name', 'contact_name']);
    return paginate(filtered, query);
  },

  '/api/v1/fields': (query) => {
    const data = FIELD_NAMES.flatMap(fn =>
      FHIR_VERSIONS.slice(0, 2).map(fv => ({
        field_name: fn,
        fhir_version: fv,
        count: randomInt(10000, 60000),
        is_required: Math.random() > 0.5,
      }))
    );
    const filtered = searchFilter(data, query, ['field_name']);
    return paginate(filtered, query);
  },

  '/api/v1/field-values': (query) => {
    const values = ['active', 'inactive', 'unknown', 'male', 'female', 'other',
      'final', 'preliminary', 'registered', 'cancelled', 'entered-in-error'];
    const data = values.flatMap(val =>
      FHIR_VERSIONS.slice(0, 2).map(fv => ({
        field_name: randomItem(FIELD_NAMES),
        field_value: val,
        fhir_version: fv,
        endpoint_count: randomInt(5000, 50000),
      }))
    );
    const filtered = searchFilter(data, query, ['field_name', 'field_value']);
    return paginate(filtered, query);
  },

  '/api/v1/profiles': (query) => {
    const data = PROFILE_NAMES.flatMap(pn =>
      ALL_ENDPOINTS.slice(0, 5).map(e => ({
        url: e.url,
        profile_name: pn,
        profile_url: `http://hl7.org/fhir/us/core/StructureDefinition/${pn.replace(/\s+/g, '-').toLowerCase()}`,
        resource: pn.replace('US Core ', '').replace(' Profile', ''),
        vendor_name: e.vendor_name,
        fhir_version: e.fhir_version,
      }))
    );
    const filtered = searchFilter(data, query, ['profile_name', 'url', 'vendor_name']);
    return paginate(filtered, query);
  },

  '/api/v1/implementation-guides': (query) => {
    const data = IG_NAMES.flatMap(name =>
      FHIR_VERSIONS.slice(0, 2).map(fv => ({
        name,
        fhir_version: fv,
        count: randomInt(5000, 40000),
      }))
    );
    return paginate(data, query);
  },

  '/api/v1/capstat-sizes': (_query) => {
    return VENDORS.slice(0, 8).flatMap(vendor =>
      FHIR_VERSIONS.slice(0, 2).map(fv => ({
        vendor_name: vendor,
        fhir_version: fv,
        min: randomInt(5000, 20000),
        max: randomInt(200000, 2000000),
        mean: randomInt(50000, 500000),
        std_dev: randomInt(10000, 100000),
        count: randomInt(100, 5000),
      }))
    );
  },

  '/api/v1/validations/summary': (_query) => {
    return VALIDATION_RULES.map(r => ({
      rule_name: r.rule_name,
      valid: randomInt(50000, 68000),
      invalid: randomInt(500, 5000),
      fhir_version: '4.0.1',
    }));
  },

  '/api/v1/validations/details': (_query) => {
    return VALIDATION_RULES.flatMap(r =>
      FHIR_VERSIONS.slice(0, 2).map(fv => ({
        rule_name: r.rule_name,
        description: r.description,
        reference: 'https://www.hl7.org/fhir/capabilitystatement.html',
        valid: randomInt(30000, 65000),
        invalid: randomInt(200, 5000),
        fhir_version: fv,
      }))
    );
  },

  '/api/v1/filters/vendors': (_query) => {
    return VENDORS.map(v => ({ value: v, label: v, count: randomInt(100, 10000) }));
  },

  '/api/v1/filters/fhir-versions': (_query) => {
    return FHIR_VERSIONS.map(v => ({ value: v, label: `FHIR ${v}`, count: randomInt(5000, 40000) }));
  },

  '/api/v1/filters/resources': (_query) => {
    return RESOURCE_TYPES.map(r => ({ value: r, label: r, count: randomInt(10000, 60000) }));
  },

  '/api/v1/filters/auth-types': (_query) => {
    return SECURITY_CODES.map(c => ({ value: c, label: c, count: randomInt(5000, 30000) }));
  },

  '/api/v1/filters/profiles': (_query) => {
    return PROFILE_NAMES.map(p => ({ value: p, label: p, count: randomInt(1000, 20000) }));
  },

  '/api/v1/filters/validation-groups': (_query) => {
    return VALIDATION_RULES.map(r => ({ value: r.rule_name, label: r.rule_name }));
  },

  '/api/v1/search': (query) => {
    const q = (query.q || '').toLowerCase();
    const endpoints = ALL_ENDPOINTS
      .filter(e => e.endpoint_names && e.endpoint_names.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e, i) => ({ type: 'endpoint', name: e.endpoint_names, url: e.url, rank: i + 1 }));
    const orgs = ALL_ORGANIZATIONS
      .filter(o => o.organization_name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((o, i) => ({ type: 'organization', name: o.organization_name, rank: i + 1 }));
    const vendors = VENDORS
      .filter(v => v.toLowerCase().includes(q))
      .slice(0, 5)
      .map((v, i) => ({ type: 'vendor', name: v, rank: i + 1 }));
    return {
      endpoints,
      organizations: orgs,
      vendors,
      total_count: endpoints.length + orgs.length + vendors.length,
    };
  },
};

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const { path, query } = parseQuery(req.url);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Find handler
  const handler = handlers[path];
  if (handler) {
    try {
      const data = handler(query);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error(`Error handling ${path}:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    // Check for dynamic endpoint routes like /api/v1/endpoints/:url/details
    if (path.startsWith('/api/v1/endpoints/') && path.endsWith('/details')) {
      const data = {
        url: 'https://fhir.epic.com/api/FHIR/R4',
        endpoint_names: 'Epic Production FHIR Endpoint',
        vendor_name: 'Epic Systems',
        fhir_version: '4.0.1',
        capability_fhir_version: '4.0.1',
        format: 'application/fhir+json',
        http_response: 200,
        response_time_seconds: 0.342,
        smart_http_response: 200,
        availability: 99.7,
        status: 'Active',
        tls_version: 'TLSv1.3',
        mime_types: 'application/fhir+json',
        capability_statement: '{}',
        smart_response: '{}',
        organizations: [
          { organization_npi_id: '1234567890', organization_name: 'Sample Health System', confidence: 0.95 }
        ],
        products: [
          { name: 'Epic EHR', version: '2024', api_url: 'https://fhir.epic.com', certification_status: 'Active', certification_date: '2024-01-15', certification_edition: '2015', chpl_id: 'CHPL-12345', last_modified_in_chpl: '2024-06-01' }
        ],
        included_fields: 'Patient,Observation,Condition',
        operation_resource: 'Patient/$everything',
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    // CSV download endpoints
    if (path.includes('/csv') || path.includes('/export')) {
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end('url,vendor_name,fhir_version\nhttps://fhir.example.com,Epic Systems,4.0.1\n');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  🏮 Lantern Mock API running at http://localhost:${PORT}\n`);
  console.log(`  Endpoints available:`);
  Object.keys(handlers).forEach(p => console.log(`    GET ${p}`));
  console.log();
});
