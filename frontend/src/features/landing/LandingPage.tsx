import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { HTTPCodeCount } from '@/api/types';
import { fetchDashboardSummary } from '@/api/dashboard';
import {
  Search,
  Building2,
  Monitor,
  ShieldCheck,
  BarChart3,
  Download,
  CheckCircle,
} from 'lucide-react';

/* =========================================================================
   Landing Page — matches Lantern_Index_V2.html mockup
   ========================================================================= */

export default function LandingPage() {
  const query = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: summary, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-navy-900 animate-pulse text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="rounded border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="mb-2 font-bold">Error loading dashboard</h2>
          <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <button
            onClick={() => query.refetch()}
            className="mt-4 rounded bg-red-100 px-4 py-2 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <HeroSection totalEndpoints={summary?.totals?.all_endpoints || 0} />
      <SearchSection />
      <main id="main-content" style={{ padding: '3rem 1rem' }}>
        <div className="container-narrow">
          <TaskCardsSection />
          <NetworkStatsSection
            totalEndpoints={summary?.totals?.all_endpoints || 0}
            organizationsCount={summary?.totals?.organizations || 0}
            vendorCount={summary?.vendor_counts?.length || 0}
            httpCodes={summary?.http_codes || []}
          />
          <PopularSearchesSection
            topOrganizations={summary?.top_organizations || []}
            vendorCounts={summary?.vendor_counts || []}
          />
        </div>
        <AboutSection />
      </main>
    </>
  );
}

/* ── Hero Section ──────────────────────────────────────────────────────── */

function HeroSection({ totalEndpoints }: { totalEndpoints: number }) {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        padding: '4rem 1rem',
        textAlign: 'center',
      }}
    >
      {/* Decorative radial gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, rgba(2, 191, 231, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(2, 191, 231, 0.08) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 mx-auto" style={{ maxWidth: '800px' }}>
        <h1
          className="font-serif font-bold"
          style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            lineHeight: 1.2,
            marginBottom: '1rem',
          }}
        >
          National FHIR Endpoint <br /> Monitoring & Analytics
        </h1>
        <p
          className="mx-auto"
          style={{
            fontSize: '1.25rem',
            opacity: 0.95,
            marginBottom: '1.5rem',
            maxWidth: '650px',
          }}
        >
          Explore nationwide data on the availability, capabilities, and standardization of
          FHIR API endpoints across the U.S. healthcare system.
        </p>
        <div
          className="inline-flex items-center gap-2 font-semibold"
          style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '0.5rem 1rem',
            borderRadius: '50px',
            fontSize: '1.125rem',
          }}
        >
          <span style={{ color: 'var(--color-accent-gold)' }}>
            {totalEndpoints > 0 ? totalEndpoints.toLocaleString() : '70,000+'}
          </span>
          <span className="text-white/90">endpoints monitored daily</span>
        </div>
      </div>
    </section>
  );
}

/* ── Search Section ────────────────────────────────────────────────────── */

function SearchSection() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div
      className="relative z-10 mx-auto"
      style={{
        background: 'var(--color-white)',
        padding: '2rem 1rem',
        marginTop: '-3rem',
        maxWidth: '900px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
      }}
      role="search"
    >
      <label
        htmlFor="hero-search"
        className="block font-bold text-center"
        style={{
          fontSize: '1.25rem',
          color: 'var(--color-primary-dark)',
          marginBottom: '0.75rem',
        }}
      >
        Find Endpoints, Organizations, or Developers
      </label>
      <form
        onSubmit={handleSearch}
        className="flex gap-3"
        style={{ marginBottom: '1rem' }}
      >
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: '1rem', color: 'var(--color-gray)' }}
            size={20}
          />
          <input
            id="hero-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full focus:outline-none"
            style={{
              padding: '1rem 1rem 1rem 3rem',
              fontSize: '1.0625rem',
              fontFamily: 'var(--font-sans)',
              border: '2px solid var(--color-gray-lighter)',
              borderRadius: '4px',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(32, 84, 147, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-gray-lighter)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            placeholder="Search by name, location, or FHIR URL..."
          />
        </div>
        <button
          type="submit"
          className="text-white whitespace-nowrap"
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            padding: '1rem 1.5rem',
            fontSize: '1.0625rem',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-dark)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)';
          }}
        >
          Search
        </button>
      </form>
      <div
        className="flex flex-wrap justify-center"
        style={{
          gap: '0.5rem 1.5rem',
          fontSize: '0.9375rem',
        }}
      >
        {[
          { label: 'Most Viewed Endpoints', to: '/endpoints' },
          { label: 'Recently Added', to: '/endpoints' },
          { label: 'Browse by Organization', to: '/organizations' },
          { label: 'Browse by Developer', to: '/downloads' },
        ].map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="flex items-center gap-2 no-underline hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            <span style={{ color: 'var(--color-gray-light)' }}>→</span>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Task Cards Section ───────────────────────────────────────────────── */

const TASKS = [
  {
    icon: <Search size={28} />,
    title: 'Find a Specific Endpoint',
    description:
      "Look up any healthcare organization's FHIR endpoint to check availability, supported resources, and uptime history.",
    href: '/endpoints',
  },
  {
    icon: <Building2 size={28} />,
    title: 'Compare Organizations',
    description:
      'See how different healthcare systems and providers compare on FHIR implementation and availability metrics.',
    href: '/organizations',
  },
  {
    icon: <Monitor size={28} />,
    title: 'Evaluate EHR Developers',
    description:
      'See which developers have the most reliable implementations and highest adoption rates across the network.',
    href: '/endpoints',
  },
  {
    icon: <ShieldCheck size={28} />,
    title: 'Check Compliance Status',
    description:
      'Find endpoints that meet regulatory requirements and ONC certification standards for healthcare data exchange.',
    href: '/validations',
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Plan a Research Project',
    description:
      'Assess data availability by resource type and identify reliable data sources for healthcare research.',
    href: '/resources',
  },
  {
    icon: <Download size={28} />,
    title: 'Download Bulk Data',
    description:
      'Export lists of endpoints, organizations, or developers to CSV format for offline analysis and reporting.',
    href: '/downloads',
  },
];

function TaskCardsSection() {
  return (
    <section style={{ marginBottom: '4rem' }} aria-labelledby="tasks-heading">
      <div className="text-center" style={{ marginBottom: '2rem' }}>
        <h2
          id="tasks-heading"
          className="font-serif"
          style={{
            fontSize: '1.75rem',
            color: 'var(--color-primary-dark)',
            marginBottom: '0.5rem',
          }}
        >
          What Can You Do?
        </h2>
        <p
          className="mx-auto"
          style={{
            color: 'var(--color-gray)',
            fontSize: '1.0625rem',
            maxWidth: '600px',
          }}
        >
          Explore healthcare interoperability data to support research, compliance, and integration
          efforts.
        </p>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {TASKS.map((task) => (
          <Link
            key={task.title}
            to={task.href}
            className="group flex flex-col no-underline"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-gray-lighter)',
              borderRadius: '8px',
              padding: '1.5rem',
              transition: 'border-color 250ms ease, box-shadow 250ms ease, transform 250ms ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-gray-lighter)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: '56px',
                height: '56px',
                background: 'var(--color-gray-lightest)',
                borderRadius: '4px',
                marginBottom: '1rem',
                color: 'var(--color-primary-dark)',
                transition: 'background-color 250ms ease',
              }}
            >
              {task.icon}
            </div>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-primary-dark)',
                marginBottom: '0.5rem',
              }}
            >
              {task.title}
            </h3>
            <p
              className="flex-1"
              style={{
                color: 'var(--color-gray)',
                fontSize: '0.9375rem',
                marginBottom: '1rem',
              }}
            >
              {task.description}
            </p>
            <span
              className="inline-flex items-center gap-2"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: '0.9375rem',
              }}
            >
              Learn More <span>→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Network Stats Section ────────────────────────────────────────────── */

function NetworkStatsSection({
  totalEndpoints,
  organizationsCount,
  vendorCount,
  httpCodes,
}: {
  totalEndpoints: number;
  organizationsCount: number;
  vendorCount: number;
  httpCodes: HTTPCodeCount[];
}) {
  // Aggregate accurate network status directly from http_codes array
  let availableCount = 0;
  let degradedCount = 0;
  let downCount = 0;

  httpCodes.forEach(hc => {
    if (hc.http_code >= 200 && hc.http_code <= 299) {
      availableCount += hc.count_endpoints;
    } else if (hc.http_code >= 300 && hc.http_code <= 499) {
      degradedCount += hc.count_endpoints;
    } else if (hc.http_code >= 500 || hc.http_code === 0) {
      downCount += hc.count_endpoints;
    }
  });
  const availablePct =
    totalEndpoints > 0 ? ((availableCount / totalEndpoints) * 100).toFixed(1) : '0.0';
  const degradedPct =
    totalEndpoints > 0 ? ((degradedCount / totalEndpoints) * 100).toFixed(1) : '0.0';
  const downPct =
    totalEndpoints > 0 ? ((downCount / totalEndpoints) * 100).toFixed(1) : '0.0';

  const stats = [
    { value: totalEndpoints.toLocaleString() || '0', label: 'Total Endpoints Monitored' },
    { value: organizationsCount.toLocaleString() || '0', label: 'Healthcare Organizations' },
    { value: vendorCount.toLocaleString() || '0', label: 'EHR Developers/Vendors' },
    { value: `${availablePct}%`, label: 'Currently Available' },
  ];

  return (
    <section
      style={{
        background: 'var(--color-gray-lightest)',
        padding: '3rem 1rem',
        margin: '0 -1rem',
        marginBottom: '4rem',
      }}
      aria-labelledby="stats-heading"
    >
      <div className="mx-auto" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '1.5rem' }}>
          <h2
            id="stats-heading"
            className="font-serif"
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-primary-dark)',
              marginBottom: '0.25rem',
            }}
          >
            Network at a Glance
          </h2>
          <p style={{ color: 'var(--color-gray)', fontSize: '0.875rem' }}>
            Last Updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Stat cards */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center"
              style={{
                background: 'var(--color-white)',
                padding: '1.5rem',
                borderRadius: '8px',
                borderLeft: '4px solid var(--color-primary)',
              }}
            >
              <span
                className="block"
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)',
                  lineHeight: 1.2,
                  marginBottom: '0.25rem',
                }}
              >
                {s.value}
              </span>
              <span style={{ color: 'var(--color-gray)', fontSize: '0.9375rem' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div
          style={{
            background: 'var(--color-white)',
            padding: '1.5rem',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontWeight: 600,
              color: 'var(--color-primary-dark)',
              marginBottom: '0.75rem',
            }}
          >
            Current Network Status
          </p>
          <div
            className="flex overflow-hidden font-semibold text-white"
            style={{
              height: '32px',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: `${availablePct}%`,
                background: 'var(--color-status-available)',
                padding: '0 0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              {availableCount > 0 ? `${availableCount.toLocaleString()} Available` : 'Available'}
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                width: `${degradedPct}%`,
                minWidth: '60px',
                background: 'var(--color-status-degraded)',
                color: 'var(--color-black)',
                padding: '0 0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              {degradedCount.toLocaleString()}
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                width: `${Math.max(parseFloat(downPct), 0.5)}%`,
                minWidth: '40px',
                background: 'var(--color-status-down)',
                padding: '0 0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              {downCount > 0 ? downCount.toLocaleString() : '—'}
            </div>
          </div>
          <div
            className="flex flex-wrap justify-center"
            style={{ gap: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-dark)' }}
          >
            <span className="flex items-center gap-2">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--color-status-available)',
                  display: 'inline-block',
                }}
              />
              Available ({availablePct}%)
            </span>
            <span className="flex items-center gap-2">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--color-status-degraded)',
                  display: 'inline-block',
                }}
              />
              Degraded ({degradedPct}%)
            </span>
            <span className="flex items-center gap-2">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--color-status-down)',
                  display: 'inline-block',
                }}
              />
              Down ({downPct}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Popular Searches Section ─────────────────────────────────────────── */

function PopularSearchesSection({
  topOrganizations,
  vendorCounts,
}: {
  topOrganizations: string[];
  vendorCounts: import('@/api/types').VendorFHIRCount[];
}) {
  // Aggregate counts by vendor_name (vendors have multiple entries for different FHIR versions)
  // and filter out 'Unknown' vendor
  const vendorTotals = vendorCounts.reduce((acc, v) => {
    if (v.vendor_name && v.vendor_name.toLowerCase() !== 'unknown') {
      acc[v.vendor_name] = (acc[v.vendor_name] || 0) + v.count;
    }
    return acc;
  }, {} as Record<string, number>);

  const topDevelopers = Object.entries(vendorTotals)
    .sort(([, aCount], [, bCount]) => bCount - aCount)
    .slice(0, 6)
    .map(([name]) => name);

  // Use fallback values if API hasn't loaded them yet
  const displayOrgs = topOrganizations.length > 0
    ? topOrganizations
    : ['Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins', 'Kaiser Permanente', 'Partners Healthcare', 'UCSF Health'];

  const displayDevs = topDevelopers.length > 0
    ? topDevelopers
    : ['Epic Systems', 'Cerner/Oracle', 'Allscripts', 'athenahealth', 'eClinicalWorks', 'Meditech'];

  const dynamicSearches = {
    Organizations: displayOrgs,
    Developers: displayDevs,
  };

  return (
    <section style={{ marginBottom: '4rem' }} aria-labelledby="popular-heading">
      <div className="text-center" style={{ marginBottom: '2rem' }}>
        <h2
          id="popular-heading"
          className="font-serif"
          style={{
            fontSize: '1.75rem',
            color: 'var(--color-primary-dark)',
            marginBottom: '0.5rem',
          }}
        >
          Top Organizations & Developers
        </h2>
        <p
          className="mx-auto"
          style={{
            color: 'var(--color-gray)',
            fontSize: '1.0625rem',
            maxWidth: '600px',
          }}
        >
          Browse the most active healthcare organizations and EHR developers in the network.
        </p>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {Object.entries(dynamicSearches).map(([category, items]) => (
          <div
            key={category}
            style={{
              flex: 1,
              background: '#fff',
              border: '1px solid var(--color-gray-lighter)',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                {category}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <Link
                  key={item}
                  to={`/search?q=${encodeURIComponent(item)}`}
                  className="inline-block no-underline"
                  style={{
                    background: 'var(--color-gray-lightest)',
                    color: 'var(--color-primary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'background-color 150ms ease, color 150ms ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary)';
                    e.currentTarget.style.color = 'var(--color-white)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--color-gray-lightest)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── About Section ────────────────────────────────────────────────────── */

const ABOUT_FEATURES = [
  {
    title: 'Daily Uptime Monitoring',
    text: 'Track endpoint performance and availability with automated daily checks.',
  },
  {
    title: 'Capability Statement Analysis',
    text: 'See what FHIR resources and operations are supported by each endpoint.',
  },
  {
    title: 'Compliance Tracking',
    text: 'Monitor regulatory requirements and ONC certification status.',
  },
  {
    title: 'No Login Required',
    text: 'All data is publicly accessible to support transparency and research.',
  },
];

function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      style={{
        background: 'var(--color-primary-dark)',
        color: 'var(--color-white)',
        padding: '3rem 1rem',
        margin: '0 -1rem',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 'var(--max-width)' }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h2
            id="about-heading"
            className="font-serif"
            style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}
          >
            About Lantern
          </h2>
          <p
            className="mx-auto"
            style={{
              fontSize: '1.0625rem',
              opacity: 0.9,
              maxWidth: '700px',
            }}
          >
            Lantern provides transparent, public access to performance and compliance data for
            over 70,000 FHIR endpoints across the United States healthcare ecosystem.
          </p>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {ABOUT_FEATURES.map((feat) => (
            <div key={feat.title} className="flex items-start" style={{ gap: '0.75rem' }}>
              <div
                className="flex shrink-0 items-center justify-center text-white"
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'var(--color-accent-green)',
                  borderRadius: '50%',
                  marginTop: '2px',
                }}
              >
                <CheckCircle size={14} />
              </div>
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{feat.title}</p>
                <p style={{ fontSize: '0.9375rem', opacity: 0.85 }}>{feat.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center" style={{ gap: '0.75rem' }}>
          {['How It Works', 'Data Methodology', 'FAQs', 'API Documentation', 'Contact Us'].map(
            (label) => (
              <Link
                key={label}
                to="/about"
                className="no-underline"
                style={{
                  color: 'var(--color-white)',
                  padding: '0.5rem 1rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  transition: 'background-color 150ms ease, border-color 150ms ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                {label}
              </Link>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
