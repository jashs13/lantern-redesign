import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SIDEBAR_NAV_SECTIONS, type NavItem } from '@/lib/constants';
import { useSidebar } from '@/context/SidebarContext';
import { NavIcon } from './NavIcon';
import clsx from 'clsx';

const linkBase = 'flex items-center gap-[11px] border-l-[3px] px-5 py-2 text-[14.5px] font-semibold no-underline transition-all';
const linkActive = 'border-l-gold-line bg-white text-blue-700 shadow-[inset_0_1px_0_theme(colors.neutral.200),inset_0_-1px_0_theme(colors.neutral.200)]';
const linkInactive = 'border-l-transparent text-neutral-600 hover:bg-blue-50 hover:text-blue-800';

const childBase = 'flex items-center border-l-[3px] py-2 pl-12 pr-5 text-[13.5px] no-underline transition-all';
const childActive = 'border-l-gold-line bg-white font-semibold text-blue-700 shadow-[inset_0_1px_0_theme(colors.neutral.200),inset_0_-1px_0_theme(colors.neutral.200)]';
const childInactive = 'border-l-transparent font-normal text-neutral-500 hover:bg-blue-50 hover:text-blue-800';

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

      {/* Sidebar — light variant, gold active accent (echoes healthit.gov's yellow tab underline) */}
      <aside
        id="sidebar-nav"
        className={clsx(
          'fixed bottom-0 left-0 top-14 z-[1000] w-[260px] overflow-y-auto overflow-x-hidden border-r border-neutral-200 bg-surface transition-transform duration-300 ease-in-out lg:top-[84px]',
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
                <div className="mx-5 my-3 h-px bg-neutral-200" />
              )}

              {/* Section label */}
              {section.label && (
                <div className="px-5 pb-2 pt-4 text-[0.6875rem] font-bold uppercase tracking-widest text-neutral-500">
                  {section.label}
                </div>
              )}

              {/* Links */}
              {section.items.map((item) => (
                <NavGroupItem key={item.path} item={item} />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavGroupItem({ item }: { item: NavItem }) {
  if (item.children) {
    return (
      <>
        {/* Group parent — a visual header with a chevron, not a route of its own (mirrors mockup) */}
        <div className={clsx(linkBase, linkInactive, 'cursor-default')}>
          {item.icon && <NavIcon id={item.icon} />}
          {item.label}
          <span className="ml-auto text-[11px] text-neutral-400">▾</span>
        </div>
        {item.children.map((child) => (
          <NavLink
            key={child.path}
            to={child.path}
            className={({ isActive }) => clsx(childBase, isActive ? childActive : childInactive)}
          >
            {child.label}
          </NavLink>
        ))}
      </>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => clsx(linkBase, isActive ? linkActive : linkInactive)}
    >
      {item.icon && <NavIcon id={item.icon} />}
      {item.label}
    </NavLink>
  );
}
