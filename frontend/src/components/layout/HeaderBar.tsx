import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

export function HeaderBar() {
  const { isCollapsed, isMobileOpen, toggleSidebar } = useSidebar();
  const isOpen = isMobileOpen || !isCollapsed;

  return (
    <header className="fixed inset-x-0 top-0 z-[1100] flex h-14 items-center justify-between bg-navy-900 px-4 text-white">
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
        <Link to="/" className="flex items-center gap-3 no-underline" aria-label="Lantern Home">
          <img
            src="/lantern-logo-white.webp"
            alt="Lantern logo"
            className="h-8 w-auto"
          />
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
  );
}
