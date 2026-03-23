import { Link } from 'react-router-dom';

const FOOTER_LINKS: { label: string; path?: string; href?: string }[] = [
  { label: 'Privacy Policy', path: '/about' },
  { label: 'API Documentation', path: '/downloads' },
  { label: 'About', path: '/about' },
  { label: 'Contact' },
  { label: 'Data Sources', href: 'https://lantern.healthit.gov/Lantern_Data_Sources_And_Algorithms.pdf' },
];

export function Footer() {
  return (
    <footer style={{ background: 'var(--color-primary-darkest)', color: 'var(--color-white)', padding: '2rem 1rem' }}>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: 'var(--max-width)' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
          &copy; {new Date().getFullYear()} Lantern.
        </span>
        <nav
          className="flex flex-wrap gap-4"
          aria-label="Footer navigation"
        >
          {FOOTER_LINKS.map((link) =>
            link.href ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
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
              </a>
            ) : link.path ? (
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
            ) : (
              <span
                key={link.label}
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.9375rem',
                  cursor: 'default',
                }}
              >
                {link.label}
              </span>
            )
          )}
        </nav>
      </div>
    </footer>
  );
}
