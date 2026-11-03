import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { LoadingState } from '@/components/ui/LoadingState';
import { useSidebar } from '@/context/SidebarContext';
import clsx from 'clsx';

/**
 * Layout for all data pages. Provides sidebar navigation, header bar,
 * constrained-width container, and footer.
 */
export function SidebarLayout() {
  const { isCollapsed } = useSidebar();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-100">
      <HeaderBar />
      <Sidebar />
      <div
        className={clsx(
          'flex min-h-screen flex-col pt-14 transition-[margin-left] duration-300 ease-in-out lg:pt-[84px]',
          isCollapsed ? 'lg:ml-0' : 'lg:ml-[260px]',
        )}
      >
        <main className="flex-1">
          <div className="container-page py-6">
            <RouteErrorBoundary key={location.pathname}>
              <Suspense fallback={<LoadingState />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
