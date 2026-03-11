import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { fetchValidationMetrics } from '@/api/validations';
import { fetchFieldValueMetrics } from '@/api/fields';
import { fetchDashboardSummary } from '@/api/dashboard';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

export default function CapabilitiesHubPage() {
  const { data: validationMetrics } = useQuery({
    queryKey: ['validationMetrics', 0, 'endpoints'],
    queryFn: () => fetchValidationMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fieldMetrics } = useQuery({
    queryKey: ['fieldValueMetrics', 0, 'endpoints'],
    queryFn: () => fetchFieldValueMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dashboardSummary } = useQuery({
    queryKey: ['dashboardSummary', 0, 'endpoints'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const passRateStr = validationMetrics?.pass_rate != null ? `${validationMetrics.pass_rate}%` : '...';
  const totalRules = validationMetrics?.total_rules != null ? Math.round(validationMetrics.total_rules) : '...';
  const trackedFields = fieldMetrics?.fields_with_values != null ? Math.round(fieldMetrics.fields_with_values) : '...';
  // Note: the backend returns 'indexed_endpoints' from dashboard api inside the totals object
  const totalEndpointsStr = dashboardSummary?.totals?.indexed_endpoints != null ? dashboardSummary.totals.indexed_endpoints.toLocaleString() : '...';

  return (
    <div className="pb-8">
      {/* Top Breadcrumb (Above Hero) */}
      <div className="container-page px-4 pt-6 pb-4">
        <Breadcrumb items={[{ label: 'Capabilities' }]} />
      </div>

      {/* Page Hero */}
      <section className="bg-gradient-to-b from-navy-900 to-navy-700 text-white pt-16 pb-20 px-4 text-center relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(2,191,231,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(2,191,231,0.08) 0%, transparent 50%)' }} 
        />
        
        <div className="max-w-3xl mx-auto relative z-10 py-2">
          <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight mb-4 text-white">Capability Statement Analysis</h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto font-light">
            A comprehensive view of what {totalEndpointsStr === '...' ? 'thousands of' : totalEndpointsStr} FHIR endpoints can do, how they're secured, and how well they conform to the specification.
          </p>
        </div>
      </section>

      {/* At a Glance KPIs */}
      <div className="container-page relative z-10 -mt-12 mb-16 px-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-navy-600 flex flex-col justify-between">
            <div className="text-[2rem] font-bold text-navy-900 leading-tight">{totalEndpointsStr}</div>
            <div className="text-sm text-neutral-500 mt-1">Indexed Endpoints</div>
          </div>
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-blue-400 flex flex-col justify-between">
            <div className="text-[2rem] text-neutral-300 font-bold leading-tight flex justify-center"><HelpCircle size={36}/></div>
            <div className="text-sm text-neutral-500 mt-1">Distinct Resource Types</div>
          </div>
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-green-500 flex flex-col justify-between">
            <div className="text-[2rem] text-neutral-300 font-bold leading-tight flex justify-center"><HelpCircle size={36}/></div>
            <div className="text-sm text-neutral-500 mt-1">OAuth / SMART Secured</div>
          </div>
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-yellow-500 flex flex-col justify-between">
            <div className="text-[2rem] text-neutral-300 font-bold leading-tight flex justify-center"><HelpCircle size={36}/></div>
            <div className="text-sm text-neutral-500 mt-1">Implementation Guides</div>
          </div>
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-orange-500 flex flex-col justify-between">
            <div className="text-[2rem] font-bold text-navy-900 leading-tight">{passRateStr}</div>
            <div className="text-sm text-neutral-500 mt-1">Pass All Validations</div>
          </div>
          <div className="bg-white rounded-lg p-5 text-center shadow-md border-t-4 border-purple-500 flex flex-col justify-between">
            <div className="text-[2rem] text-neutral-300 font-bold leading-tight flex justify-center"><HelpCircle size={36}/></div>
            <div className="text-sm text-neutral-500 mt-1">Distinct Profiles</div>
          </div>
        </div>
      </div>

      <div className="container-page px-4">
        {/* Section Heading */}
        <div className="text-center mb-10">
          <h2 className="font-serif text-[1.75rem] font-bold text-navy-900 mb-2">Explore Capability Statement Data</h2>
          <p className="text-neutral-500 text-[1.0625rem] max-w-2xl mx-auto">
            All data is parsed from the FHIR Capability Statements returned by each endpoint. Choose an area to dive deeper.
          </p>
        </div>

        {/* Area Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          
          {/* Card 1: Capabilities & Resources */}
          <article className="bg-white rounded-lg overflow-hidden flex flex-col shadow-sm border border-neutral-200 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary-light">
            <div className="p-6">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[1.75rem] mb-4 bg-blue-50">📦</div>
              <h3 className="font-serif text-[1.375rem] font-bold text-navy-900 mb-2">Capabilities &amp; Resources</h3>
              <p className="text-neutral-500 text-[0.9375rem] leading-relaxed">
                What can endpoints do? Explore the FHIR resources, implementation guides, profiles, and overall capability statement coverage declared by endpoints.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200 mt-auto">
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">Resource Types</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">IGs Reported</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">Profiles</div>
              </div>
            </div>
            <div className="p-4 px-5 border-t border-neutral-200 h-[178px]">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Includes</div>
              <ul className="space-y-2">
                <li className="border-b border-neutral-100 pb-2"><Link to="/capabilities/resources" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Resources <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="border-b border-neutral-100 pb-2"><Link to="/capabilities/resources" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Implementation Guides <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="border-b border-neutral-100 pb-2"><Link to="/capabilities/resources" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Profiles <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="pb-1"><Link to="/capabilities/resources" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Capability Statement Size <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
              </ul>
            </div>
            <Link to="/capabilities/resources" className="block p-4 px-5 text-center bg-primary text-white font-bold text-[0.9375rem] transition-colors hover:bg-navy-900">
              Explore Resources &amp; Capabilities &rarr;
            </Link>
          </article>

          {/* Card 2: Security & SMART */}
          <article className="bg-white rounded-lg overflow-hidden flex flex-col shadow-sm border border-neutral-200 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary-light">
            <div className="p-6">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[1.75rem] mb-4 bg-green-50">🔒</div>
              <h3 className="font-serif text-[1.375rem] font-bold text-navy-900 mb-2">Security &amp; SMART</h3>
              <p className="text-neutral-500 text-[0.9375rem] leading-relaxed">
                How are endpoints secured? Analyze authorization types from capability statements and SMART-on-FHIR core capabilities from well-known configuration documents.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200 mt-auto">
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">OAuth/SMART</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">Well-Known</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-neutral-300 mt-1"><HelpCircle size={28}/></div>
                <div className="text-xs text-neutral-500">No Auth</div>
              </div>
            </div>
            <div className="p-4 px-5 border-t border-neutral-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Includes</div>
              <ul className="space-y-2">
                <li className="border-b border-neutral-100 pb-2"><Link to="/capabilities/security" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Authorization Types <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="pb-1"><Link to="/capabilities/security" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">SMART-on-FHIR Capabilities <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
              </ul>
            </div>
            <Link to="/capabilities/security" className="block p-4 px-5 text-center bg-primary text-white font-bold text-[0.9375rem] transition-colors hover:bg-navy-900 mt-auto">
              Explore Security &amp; SMART &rarr;
            </Link>
          </article>

          {/* Card 3: Conformance & Validation */}
          <article className="bg-white rounded-lg overflow-hidden flex flex-col shadow-sm border border-neutral-200 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary-light">
            <div className="p-6">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[1.75rem] mb-4 bg-orange-50">✅</div>
              <h3 className="font-serif text-[1.375rem] font-bold text-navy-900 mb-2">Conformance &amp; Validation</h3>
              <p className="text-neutral-500 text-[0.9375rem] leading-relaxed">
                How well do endpoints conform to the spec? Review which capability statement fields are present, what values they hold, and which validation rules pass or fail.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200 mt-auto">
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-[1.375rem] font-bold text-navy-900 leading-tight">{passRateStr}</div>
                <div className="text-xs text-neutral-500">Pass All Rules</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-[1.375rem] font-bold text-navy-900 leading-tight">{totalRules}</div>
                <div className="text-xs text-neutral-500">Validation Rules</div>
              </div>
              <div className="bg-neutral-50 p-4 min-h-[100px] flex flex-col items-center justify-between text-center">
                <div className="text-[1.375rem] font-bold text-navy-900 leading-tight">{trackedFields}</div>
                <div className="text-xs text-neutral-500">Fields Tracked</div>
              </div>
            </div>
            <div className="p-4 px-5 border-t border-neutral-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Includes</div>
              <ul className="space-y-2">
                <li className="border-b border-neutral-100 pb-2"><Link to="/conformance-validation" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">CapStat Fields <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="border-b border-neutral-100 pb-2"><Link to="/conformance-validation" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Field Values <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
                <li className="pb-1"><Link to="/conformance-validation" className="text-primary font-semibold text-[0.9375rem] flex items-center justify-between group hover:underline">Validation Results <ArrowRight size={14} className="text-primary transition-transform group-hover:translate-x-1" /></Link></li>
              </ul>
            </div>
            <Link to="/conformance-validation" className="block p-4 px-5 text-center bg-primary text-white font-bold text-[0.9375rem] transition-colors hover:bg-navy-900">
              Explore Conformance &amp; Validation &rarr;
            </Link>
          </article>

        </div>

        {/* What is a Capability Statement Section */}
        <section className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-neutral-200 mb-8">
          <h2 className="font-serif text-[1.5rem] font-bold text-navy-900 mb-4 text-center">What's in a FHIR Capability Statement?</h2>
          <p className="text-neutral-500 text-[1rem] max-w-3xl mx-auto mb-10 text-center leading-relaxed">
            A FHIR Capability Statement is a document published by every FHIR server that describes what the server can do. Lantern collects and analyzes these documents daily from over 70,000 endpoints to give you a picture of the healthcare data exchange landscape.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-[2.5rem] mb-3">📋</div>
              <div className="font-bold text-[0.9375rem] text-navy-900 mb-1">Resources</div>
              <div className="text-[0.8125rem] text-neutral-500">Which FHIR resource types (Patient, Observation, etc.) the endpoint supports</div>
            </div>
            <div className="text-center">
              <div className="text-[2.5rem] mb-3">🔒</div>
              <div className="font-bold text-[0.9375rem] text-navy-900 mb-1">Security</div>
              <div className="text-[0.8125rem] text-neutral-500">How the endpoint handles authorization (OAuth, SMART, etc.)</div>
            </div>
            <div className="text-center">
              <div className="text-[2.5rem] mb-3">📖</div>
              <div className="font-bold text-[0.9375rem] text-navy-900 mb-1">Implementation Guides</div>
              <div className="text-[0.8125rem] text-neutral-500">Which IGs (US Core, SMART App Launch, etc.) are referenced</div>
            </div>
            <div className="text-center">
              <div className="text-[2.5rem] mb-3">✅</div>
              <div className="font-bold text-[0.9375rem] text-navy-900 mb-1">Conformance</div>
              <div className="text-[0.8125rem] text-neutral-500">Whether the statement includes required fields and passes validation</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
