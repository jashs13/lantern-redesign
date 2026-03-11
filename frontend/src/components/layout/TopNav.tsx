import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { TOP_NAV_ITEMS, MORE_NAV_ITEMS } from '@/lib/constants';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-navy-900 text-white">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 no-underline" aria-label="Lantern Home">
            <div
              className="flex items-center justify-center font-bold text-white"
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%)',
                borderRadius: '50%',
                fontSize: '1.5rem',
              }}
            >
              L
            </div>
            <div>
              <div className="font-serif font-bold leading-tight text-white" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Lantern</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 400 }} className="text-white">
                FHIR Endpoint Monitor
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {TOP_NAV_ITEMS.map((item) => (
              item.label === 'Capabilities' ? null : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={{ fontSize: '0.9375rem' }}
                  className={({ isActive }) =>
                    `rounded px-4 py-2 font-semibold transition-colors no-underline ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            ))}

            {/* Capabilities dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button style={{ fontSize: '0.9375rem' }} className="flex items-center gap-1 rounded px-4 py-2 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/15 data-[state=open]:text-white">
                  Capabilities
                  <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[280px] rounded-md bg-white p-2 shadow-elevated"
                  sideOffset={8}
                  align="start"
                >
                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities"
                      end
                      className={({ isActive }) =>
                        `block rounded-md px-4 py-3 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-neutral-100 text-primary'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary'
                        }`
                      }
                    >
                      <div className="mb-0.5 font-bold text-[0.9375rem]">📋 Overview</div>
                      <div className="text-[0.8125rem] font-normal text-neutral-500">Capability statement health check at a glance</div>
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-2 h-px bg-neutral-200 mx-4" />
                  <DropdownMenu.Label className="px-4 py-1 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-wider text-neutral-400">
                    Explore
                  </DropdownMenu.Label>

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities/resources"
                      className={({ isActive }) =>
                        `block rounded-md px-4 py-3 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-neutral-100 text-primary'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary'
                        }`
                      }
                    >
                      <div className="mb-0.5 font-bold text-[0.9375rem]">📦 Capabilities & Resources</div>
                      <div className="text-[0.8125rem] font-normal text-neutral-500">Resources, IGs, profiles, and capability sizes</div>
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities/security"
                      className={({ isActive }) =>
                        `block rounded-md px-4 py-3 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-neutral-100 text-primary'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary'
                        }`
                      }
                    >
                      <div className="mb-0.5 font-bold text-[0.9375rem]">🔒 Security & SMART</div>
                      <div className="text-[0.8125rem] font-normal text-neutral-500">Authorization types and SMART-on-FHIR support</div>
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/conformance-validation"
                      className={({ isActive }) =>
                        `block rounded-md px-4 py-3 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-neutral-100 text-primary'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary'
                        }`
                      }
                    >
                      <div className="mb-0.5 font-bold text-[0.9375rem]">✅ Conformance & Validation</div>
                      <div className="text-[0.8125rem] font-normal text-neutral-500">Field inclusion, values, and validation results</div>
                    </NavLink>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* More dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button style={{ fontSize: '0.9375rem' }} className="flex items-center gap-1 rounded px-4 py-2 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                  More
                  <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[200px] rounded-md bg-white py-1 shadow-elevated"
                  sideOffset={8}
                  align="end"
                >
                  {MORE_NAV_ITEMS.map((item) => (
                    <DropdownMenu.Item key={item.path} asChild>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm outline-none no-underline ${isActive
                            ? 'bg-navy-700/10 font-semibold text-navy-700'
                            : 'text-neutral-600 hover:bg-neutral-100'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-200" />
                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/about"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm outline-none no-underline ${isActive
                          ? 'bg-navy-700/10 font-semibold text-navy-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      About
                    </NavLink>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="rounded p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 pb-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="container-page space-y-1 pt-2">
            {[...TOP_NAV_ITEMS, ...MORE_NAV_ITEMS, { label: 'About', path: '/about' }].map(
              (item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2.5 text-sm font-semibold no-underline ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
