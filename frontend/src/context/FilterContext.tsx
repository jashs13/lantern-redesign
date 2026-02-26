import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeArrayParam, encodeArrayParam } from '@/lib/url';

export interface FilterState {
  fhirVersions: string[];
  vendor: string | null;
}

export interface FilterContextValue {
  filters: FilterState;
  setFhirVersions: (versions: string[]) => void;
  setVendor: (vendor: string | null) => void;
  resetFilters: () => void;
}

export const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    return {
      fhirVersions: decodeArrayParam(searchParams.get('fhir_versions')),
      vendor: searchParams.get('vendor') || null,
    };
  }, [searchParams]);

  const setFhirVersions = useCallback(
    (versions: string[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (versions.length > 0) {
            next.set('fhir_versions', encodeArrayParam(versions));
          } else {
            next.delete('fhir_versions');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setVendor = useCallback(
    (vendor: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (vendor) {
            next.set('vendor', vendor);
          } else {
            next.delete('vendor');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('fhir_versions');
        next.delete('vendor');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const value = useMemo<FilterContextValue>(
    () => ({ filters, setFhirVersions, setVendor, resetFilters }),
    [filters, setFhirVersions, setVendor, resetFilters],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
