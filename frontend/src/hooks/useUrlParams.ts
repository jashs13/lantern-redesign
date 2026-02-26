import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook for bidirectional URL parameter synchronization.
 * Useful for persisting per-page state (search, sort, pagination) in the URL.
 */
export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key: string, defaultValue = ''): string => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams],
  );

  const getNumericParam = useCallback(
    (key: string, defaultValue: number): number => {
      const val = searchParams.get(key);
      if (val === null) return defaultValue;
      const num = parseInt(val, 10);
      return isNaN(num) ? defaultValue : num;
    },
    [searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { searchParams, getParam, getNumericParam, setParam };
}
