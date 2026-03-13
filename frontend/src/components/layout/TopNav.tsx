import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { TOP_NAV_ITEMS, MORE_NAV_ITEMS, LEGACY_NAV_ITEMS } from '@/lib/constants';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-navy-900 text-white">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center no-underline" aria-label="Lantern Home">
            <img
              src="/lantern-logo-white.webp"
              alt="Lantern logo"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {TOP_NAV_ITEMS.map((item) => (
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
                  className="z-50 min-w-[280px] rounded-md bg-white py-1 shadow-elevated flex flex-col"
                  sideOffset={8}
                  align="start"
                >
                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities"
                      end
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-navy-700/10 font-semibold text-navy-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      Overview
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-px bg-neutral-200 my-1" />

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities/resources"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-navy-700/10 font-semibold text-navy-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      Capabilities & Resources
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/capabilities/security"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-navy-700/10 font-semibold text-navy-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      Security & SMART
                    </NavLink>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <NavLink
                      to="/conformance-validation"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm outline-none no-underline transition-colors ${isActive
                          ? 'bg-navy-700/10 font-semibold text-navy-700'
                          : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      Conformance & Validation
                    </NavLink>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Legacy dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button style={{ fontSize: '0.9375rem' }} className="flex items-center gap-1 rounded px-4 py-2 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/15 data-[state=open]:text-white">
                  Legacy
                  <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[360px] rounded-md bg-white p-2 shadow-elevated"
                  sideOffset={8}
                  align="start"
                >
                  <div className="grid grid-cols-2 gap-1">
                    {LEGACY_NAV_ITEMS.map((item) => (
                      <DropdownMenu.Item key={item.path} asChild>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm outline-none no-underline transition-colors ${isActive
                              ? 'bg-navy-700/10 font-semibold text-navy-700'
                              : 'text-neutral-600 hover:bg-neutral-100'
                            }`
                          }
                        >
                          {item.label}
                        </NavLink>
                      </DropdownMenu.Item>
                    ))}
                  </div>
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
                  className="z-50 min-w-[200px] rounded-md bg-white py-1 shadow-elevated flex flex-col"
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
            {[...TOP_NAV_ITEMS, { label: 'Capabilities', path: '/capabilities' }, ...LEGACY_NAV_ITEMS, ...MORE_NAV_ITEMS, { label: 'About', path: '/about' }].map(
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
