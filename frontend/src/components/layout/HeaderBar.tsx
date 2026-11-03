import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, Lock } from 'lucide-react';
import clsx from 'clsx';
import { useSidebar } from '@/context/SidebarContext';

export function HeaderBar() {
  const { isCollapsed, isMobileOpen, toggleSidebar } = useSidebar();
  const isOpen = isMobileOpen || !isCollapsed;
  const [govInfoOpen, setGovInfoOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 top-0 z-[1100]">
      {/* USWDS "official government website" banner — matches lantern.healthit.gov */}
      <div className="hidden bg-[#f0f0f0] lg:block">
        <div className="flex h-7 items-center gap-2 px-4 text-xs text-neutral-600">
          <span aria-hidden="true">🇺🇸</span>
          <span>An official website of the United States government</span>
          <button
            type="button"
            onClick={() => setGovInfoOpen((v) => !v)}
            aria-expanded={govInfoOpen}
            className="ml-1 inline-flex items-center gap-1 font-medium text-neutral-600 underline hover:text-blue-800"
          >
            Here&apos;s how you know
            <ChevronDown size={12} className={clsx('transition-transform', govInfoOpen && 'rotate-180')} />
          </button>
        </div>
        {govInfoOpen && (
          <div className="grid grid-cols-2 gap-6 border-t border-neutral-200 bg-white px-6 py-4 text-xs text-neutral-600">
            <div className="flex gap-2">
              <span className="text-base" aria-hidden="true">🏛️</span>
              <p>
                <strong className="block text-sm text-neutral-800">Official websites use .gov</strong>
                A <strong>.gov</strong> website belongs to an official government organization in the United States.
              </p>
            </div>
            <div className="flex gap-2">
              <Lock size={16} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
              <p>
                <strong className="block text-sm text-neutral-800">Secure .gov websites use HTTPS</strong>
                A lock (<Lock size={10} className="inline" aria-hidden="true" />) or https:// means you&apos;ve safely
                connected to the .gov website. Share sensitive information only on official, secure websites.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Header band — ONC navy (var(--blue-900), #0e1f75), sampled from healthit.gov */}
      <header className="flex h-14 items-center justify-between bg-blue-900 px-4 text-white">
        {/* Left: toggle + brand */}
        <div className="flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            onClick={toggleSidebar}
            aria-expanded={isOpen}
            aria-controls="sidebar-nav"
            aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'}
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" className="flex flex-col items-start justify-center no-underline" aria-label="Lantern Home">
            <img
              src="/lantern-logo-white.webp"
              alt="Lantern logo"
              className="h-8 w-auto"
            />
            <span className="hidden text-xs text-white/70 lg:block">
              Monitoring 90,000+ FHIR endpoints across U.S. healthcare organizations
            </span>
          </Link>
        </div>

        {/* Right: version + GitHub */}
        <div className="flex items-center gap-4 text-sm text-white/80">
          <span className="rounded border border-white/25 px-3 py-0.5 font-semibold">
            v3.0.0
          </span>
          <a
            href="https://github.com/onc-healthit/lantern-back-end"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 no-underline transition-colors hover:bg-white/10 hover:text-white"
            aria-label="GitHub"
            title="GitHub"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>
    </div>
  );
}
