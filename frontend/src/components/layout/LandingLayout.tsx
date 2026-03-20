import { Outlet } from 'react-router-dom';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

/**
 * Layout for the landing page — full-width content area (hero spans edge to edge).
 * Sidebar is available via toggle but content is always full-width.
 */
export function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderBar />
      <Sidebar />
      <main className="flex-1 pt-14">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
