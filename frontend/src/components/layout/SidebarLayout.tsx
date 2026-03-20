import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useSidebar } from '@/context/SidebarContext';
import clsx from 'clsx';

/**
 * Layout for all data pages. Provides sidebar navigation, header bar,
 * constrained-width container, and footer.
 */
export function SidebarLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-neutral-100">
      <HeaderBar />
      <Sidebar />
      <div
        className={clsx(
          'flex min-h-screen flex-col pt-14 transition-[margin-left] duration-300 ease-in-out',
          isCollapsed ? 'lg:ml-0' : 'lg:ml-[260px]',
        )}
      >
        <main className="flex-1">
          <div className="container-page py-6">
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
