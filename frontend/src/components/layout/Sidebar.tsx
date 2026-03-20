import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SIDEBAR_NAV_SECTIONS } from '@/lib/constants';
import { useSidebar } from '@/context/SidebarContext';
import clsx from 'clsx';

export function Sidebar() {
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 top-14 z-[999] bg-black/40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={clsx(
          'fixed bottom-0 left-0 top-14 z-[1000] w-[260px] overflow-y-auto overflow-x-hidden border-r border-white/5 bg-navy-950 transition-transform duration-300 ease-in-out',
          // Desktop: collapse via translate
          !isMobileOpen && isCollapsed && 'max-lg:-translate-x-full lg:-translate-x-full',
          // Mobile: hidden by default, shown when open
          !isMobileOpen && !isCollapsed && 'max-lg:-translate-x-full lg:translate-x-0',
          isMobileOpen && 'translate-x-0',
        )}
        aria-label="Main navigation"
      >
        <nav className="py-3">
          {SIDEBAR_NAV_SECTIONS.map((section, sectionIdx) => (
            <div key={section.label ?? sectionIdx}>
              {/* Divider between sections (not before the first) */}
              {sectionIdx > 0 && (
                <div className="mx-5 my-3 h-px bg-white/[0.08]" />
              )}

              {/* Section label */}
              {section.label && (
                <div className="px-5 pb-2 pt-4 text-[0.6875rem] font-bold uppercase tracking-widest text-white/35">
                  {section.label}
                </div>
              )}

              {/* Links */}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center border-l-[3px] px-5 py-2.5 text-[0.9375rem] font-semibold no-underline transition-all',
                      isActive
                        ? 'border-l-sky-500 bg-white/10 text-white'
                        : 'border-l-transparent text-white/75 hover:bg-white/[0.06] hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
