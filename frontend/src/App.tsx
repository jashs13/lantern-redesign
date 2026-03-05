import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryProvider } from '@/context/QueryProvider';
import { FilterProvider } from '@/context/FilterContext';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { DataPageLayout } from '@/components/layout/DataPageLayout';
import { LoadingState } from '@/components/ui/LoadingState';

// Lazy-loaded page components — each becomes its own code-split chunk
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const EndpointsPage = lazy(() => import('@/features/endpoints/EndpointsPage'));
const OrganizationsPage = lazy(() => import('@/features/organizations/OrganizationsPage'));
const ResourcesPage = lazy(() => import('@/features/resources/ResourcesPage'));
const ImplementationGuidesPage = lazy(
  () => import('@/features/implementation-guides/ImplementationGuidesPage'),
);
const FieldsPage = lazy(() => import('@/features/fields/FieldsPage'));
const ProfilesPage = lazy(() => import('@/features/profiles/ProfilesPage'));
const CapStatSizePage = lazy(() => import('@/features/capstat-size/CapStatSizePage'));
const ValidationsPage = lazy(() => import('@/features/validations/ValidationsPage'));
const SecurityPage = lazy(() => import('@/features/security/SecurityPage'));
const SmartResponsePage = lazy(() => import('@/features/smart-response/SmartResponsePage'));
const ContactsPage = lazy(() => import('@/features/contacts/ContactsPage'));
const DownloadsPage = lazy(() => import('@/features/downloads/DownloadsPage'));
const AboutPage = lazy(() => import('@/features/about/AboutPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <FilterProvider>
          <Routes>
            {/* Landing page with its own full-width layout */}
            <Route element={<LandingLayout />}>
              <Route
                index
                element={
                  <Suspense fallback={<LoadingState />}>
                    <LandingPage />
                  </Suspense>
                }
              />
            </Route>

            {/* All data pages share the constrained DataPageLayout */}
            <Route element={<DataPageLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<LoadingState />}><DashboardPage /></Suspense>} />
              <Route path="endpoints" element={<Suspense fallback={<LoadingState />}><EndpointsPage /></Suspense>} />
              <Route path="organizations" element={<Suspense fallback={<LoadingState />}><OrganizationsPage /></Suspense>} />
              <Route path="resources" element={<Suspense fallback={<LoadingState />}><ResourcesPage /></Suspense>} />
              <Route path="implementation-guides" element={<Suspense fallback={<LoadingState />}><ImplementationGuidesPage /></Suspense>} />
              <Route path="fields" element={<Suspense fallback={<LoadingState />}><FieldsPage /></Suspense>} />
              <Route path="profiles" element={<Suspense fallback={<LoadingState />}><ProfilesPage /></Suspense>} />
              <Route path="capstat-size" element={<Suspense fallback={<LoadingState />}><CapStatSizePage /></Suspense>} />
              <Route path="validations" element={<Suspense fallback={<LoadingState />}><ValidationsPage /></Suspense>} />
              <Route path="security" element={<Suspense fallback={<LoadingState />}><SecurityPage /></Suspense>} />
              <Route path="smart-response" element={<Suspense fallback={<LoadingState />}><SmartResponsePage /></Suspense>} />
              <Route path="contacts" element={<Suspense fallback={<LoadingState />}><ContactsPage /></Suspense>} />
              <Route path="downloads" element={<Suspense fallback={<LoadingState />}><DownloadsPage /></Suspense>} />
              <Route path="about" element={<Suspense fallback={<LoadingState />}><AboutPage /></Suspense>} />
              <Route path="search" element={<Suspense fallback={<LoadingState />}><SearchPage /></Suspense>} />
            </Route>
          </Routes>
        </FilterProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
