import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { label: 'Privacy Policy', path: '/about' },
  { label: 'Terms of Use', path: '/about' },
  { label: 'API Documentation', path: '/downloads' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contacts' },
  { label: 'Data Sources', path: '/resources' },
];

export function Footer() {
  return (
    <footer style={{ background: 'var(--color-primary-darkest)', color: 'var(--color-white)', padding: '2rem 1rem' }}>
      <div className="mx-auto" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Top row: Brand + Links */}
        <div
          className="flex flex-wrap items-center justify-between"
          style={{
            gap: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 no-underline"
            aria-label="Lantern Home"
          >
            <div
              className="flex items-center justify-center font-bold text-white"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%)',
                borderRadius: '50%',
                fontSize: '1.25rem',
              }}
            >
              L
            </div>
            <span className="font-serif font-bold text-white" style={{ fontSize: '1.25rem' }}>
              Lantern
            </span>
          </Link>

          {/* Navigation links */}
          <nav
            className="flex flex-wrap gap-4"
            aria-label="Footer navigation"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="no-underline"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.9375rem',
                  transition: 'color 150ms ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'var(--color-white)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div
          className="flex flex-wrap items-center justify-between"
          style={{ gap: '1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}
        >
          <p>&copy; {new Date().getFullYear()} Lantern. Data refreshed daily at 8:00 PM ET.</p>
          <p>
            An{' '}
            <a
              href="https://www.healthit.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 150ms ease' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-white)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              ONC
            </a>{' '}
            Initiative &middot; Built by{' '}
            <a
              href="https://www.mettlesolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 150ms ease' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-white)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              Mettle Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
