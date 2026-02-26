import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/**
 * Local pagination state hook.
 * Returns current page/pageSize and setters.
 */
export function usePagination(
  initialPageSize = DEFAULT_PAGE_SIZE,
): PaginationState & PaginationActions {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1); // Reset to page 1 when page size changes
  }, []);

  const reset = useCallback(() => {
    setPageState(1);
    setPageSizeState(initialPageSize);
  }, [initialPageSize]);

  return { page, pageSize, setPage, setPageSize, reset };
}
