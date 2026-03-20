import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from '@/context/QueryProvider';
import { FilterProvider } from '@/context/FilterContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { LoadingState } from '@/components/ui/LoadingState';

// Lazy-loaded page components
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const EndpointsPage = lazy(() => import('@/features/endpoints/EndpointsPage'));
const OrganizationsPage = lazy(() => import('@/features/organizations/OrganizationsPage'));
const ContactsPage = lazy(() => import('@/features/contacts/ContactsPage'));
const DownloadsPage = lazy(() => import('@/features/downloads/DownloadsPage'));
const AboutPage = lazy(() => import('@/features/about/AboutPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));

// Capability pages (standalone versions of former CapabilitiesResources tabs)
const ResourcesPage = lazy(() => import('@/features/resources/ResourcesTabContent'));
const ImplementationGuidesPage = lazy(() => import('@/features/implementation-guides/ImplementationGuidesTabContent'));
const ProfilesPage = lazy(() => import('@/features/profiles/ProfilesTabContent'));
const CapStatSizePage = lazy(() => import('@/features/capstat-size/CapStatSizeTabContent'));

// Conformance pages (standalone versions of former ConformanceValidation tabs)
const CapStatFieldsPage = lazy(() => import('@/features/conformance/CapStatFieldsPage'));
const CapStatValuesPage = lazy(() => import('@/features/conformance/FieldValuesPage'));
const ValidationResultsPage = lazy(() => import('@/features/conformance/ValidationResultsPage'));

// Security pages (standalone versions of former SecuritySmart tabs)
const AuthorizationTypesPage = lazy(() => import('@/features/security/AuthorizationTypesPage'));
const SmartCapabilitiesPage = lazy(() => import('@/features/smart-response/SmartCapabilitiesPage'));

// Capabilities Hub Pages
const CapabilitiesHubPage = lazy(() => import('@/features/capabilities/CapabilitiesHubPage'));
const CapabilitiesResourcesPage = lazy(() => import('@/features/capabilities/CapabilitiesResourcesPage'));
const SecuritySmartPlaceholder = lazy(() => import('@/features/capabilities/SecuritySmartPlaceholder'));
const ConformanceValidationPage = lazy(() => import('@/features/conformance/ConformanceValidationPage'));

// Legacy pages (accessible at /legacy/...)
const LegacyResourcesPage = lazy(() => import('@/features/resources/ResourcesPage'));
const LegacyImplementationGuidesPage = lazy(() => import('@/features/implementation-guides/ImplementationGuidesPage'));
const LegacyFieldsPage = lazy(() => import('@/features/fields/FieldsPage'));
const LegacyProfilesPage = lazy(() => import('@/features/profiles/ProfilesPage'));
const LegacyCapStatSizePage = lazy(() => import('@/features/capstat-size/CapStatSizePage'));
const LegacyValidationsPage = lazy(() => import('@/features/validations/ValidationsPage'));
const LegacySecurityPage = lazy(() => import('@/features/security/SecurityPage'));
const LegacySmartResponsePage = lazy(() => import('@/features/smart-response/SmartResponsePage'));

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <FilterProvider>
          <SidebarProvider>
            <Routes>
              {/* Root redirects to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Landing page at /landing with its own full-width layout (no sidebar) */}
              <Route element={<LandingLayout />}>
                <Route
                  path="landing"
                  element={
                    <Suspense fallback={<LoadingState />}>
                      <LandingPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* All data pages share the sidebar layout */}
              <Route element={<SidebarLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<LoadingState />}><DashboardPage /></Suspense>} />
              <Route path="endpoints" element={<Suspense fallback={<LoadingState />}><EndpointsPage /></Suspense>} />
              <Route path="organizations" element={<Suspense fallback={<LoadingState />}><OrganizationsPage /></Suspense>} />
              {/* Capability pages (standalone) */}
              <Route path="resources" element={<Suspense fallback={<LoadingState />}><ResourcesPage /></Suspense>} />
              <Route path="implementation-guides" element={<Suspense fallback={<LoadingState />}><ImplementationGuidesPage /></Suspense>} />
              <Route path="profiles" element={<Suspense fallback={<LoadingState />}><ProfilesPage /></Suspense>} />
              <Route path="capstat-size" element={<Suspense fallback={<LoadingState />}><CapStatSizePage /></Suspense>} />

              {/* Conformance pages (standalone) */}
              <Route path="capstat-fields" element={<Suspense fallback={<LoadingState />}><CapStatFieldsPage /></Suspense>} />
              <Route path="capstat-values" element={<Suspense fallback={<LoadingState />}><CapStatValuesPage /></Suspense>} />
              <Route path="validations" element={<Suspense fallback={<LoadingState />}><ValidationResultsPage /></Suspense>} />

              {/* Security pages (standalone) */}
              <Route path="security" element={<Suspense fallback={<LoadingState />}><AuthorizationTypesPage /></Suspense>} />
              <Route path="smart-response" element={<Suspense fallback={<LoadingState />}><SmartCapabilitiesPage /></Suspense>} />

              {/* Hub pages (still accessible by URL) */}
              <Route path="conformance-validation" element={<Suspense fallback={<LoadingState />}><ConformanceValidationPage /></Suspense>} />

              {/* Capabilities hub */}
              <Route path="capabilities" element={<Suspense fallback={<LoadingState />}><CapabilitiesHubPage /></Suspense>} />
              <Route path="capabilities/resources" element={<Suspense fallback={<LoadingState />}><CapabilitiesResourcesPage /></Suspense>} />
              <Route path="capabilities/security" element={<Suspense fallback={<LoadingState />}><SecuritySmartPlaceholder /></Suspense>} />

              {/* Legacy pages */}
              <Route path="legacy/resources" element={<Suspense fallback={<LoadingState />}><LegacyResourcesPage /></Suspense>} />
              <Route path="legacy/implementation-guides" element={<Suspense fallback={<LoadingState />}><LegacyImplementationGuidesPage /></Suspense>} />
              <Route path="legacy/fields" element={<Suspense fallback={<LoadingState />}><LegacyFieldsPage /></Suspense>} />
              <Route path="legacy/profiles" element={<Suspense fallback={<LoadingState />}><LegacyProfilesPage /></Suspense>} />
              <Route path="legacy/capstat-size" element={<Suspense fallback={<LoadingState />}><LegacyCapStatSizePage /></Suspense>} />
              <Route path="legacy/validations" element={<Suspense fallback={<LoadingState />}><LegacyValidationsPage /></Suspense>} />
              <Route path="legacy/security" element={<Suspense fallback={<LoadingState />}><LegacySecurityPage /></Suspense>} />
              <Route path="legacy/smart-response" element={<Suspense fallback={<LoadingState />}><LegacySmartResponsePage /></Suspense>} />

              {/* Legacy redirects */}
              <Route path="fields" element={<Navigate to="/legacy/fields" replace />} />
              <Route path="contacts" element={<Suspense fallback={<LoadingState />}><ContactsPage /></Suspense>} />
              <Route path="downloads" element={<Suspense fallback={<LoadingState />}><DownloadsPage /></Suspense>} />
              <Route path="about" element={<Suspense fallback={<LoadingState />}><AboutPage /></Suspense>} />
              <Route path="search" element={<Suspense fallback={<LoadingState />}><SearchPage /></Suspense>} />
            </Route>
            </Routes>
          </SidebarProvider>
        </FilterProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
