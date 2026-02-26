import { useContext } from 'react';
import { FilterContext, type FilterContextValue } from '@/context/FilterContext';

/**
 * Access the global filter context (FHIR versions + vendor).
 * Must be used within a <FilterProvider>.
 */
export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used within a <FilterProvider>');
  }
  return ctx;
}
