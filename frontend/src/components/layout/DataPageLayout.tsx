import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * Layout for all data pages (Dashboard, Endpoints, Organizations, etc.).
 * Provides the top nav, constrained-width container, and footer.
 */
export function DataPageLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      <TopNav />
      <main className="flex-1">
        <div className="container-page py-6">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
