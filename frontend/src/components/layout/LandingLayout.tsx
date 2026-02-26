import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

/**
 * Layout for the landing page — full-width content area (hero spans edge to edge).
 * No breadcrumbs or page header.
 */
export function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
