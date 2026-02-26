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
const FieldValuesPage = lazy(() => import('@/features/fields/FieldValuesPage'));
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
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="endpoints" element={<EndpointsPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="implementation-guides" element={<ImplementationGuidesPage />} />
              <Route path="fields" element={<FieldsPage />} />
              <Route path="field-values" element={<FieldValuesPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="capstat-size" element={<CapStatSizePage />} />
              <Route path="validations" element={<ValidationsPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="smart-response" element={<SmartResponsePage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="downloads" element={<DownloadsPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="search" element={<SearchPage />} />
            </Route>
          </Routes>
        </FilterProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
