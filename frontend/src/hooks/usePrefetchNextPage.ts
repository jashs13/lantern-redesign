import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export function usePrefetchNextPage({
  page,
  pageSize,
  totalCount,
  queryKey,
  queryFn,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  queryKey: QueryKey;
  queryFn: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;

  useEffect(() => {
    if (!hasNextPage) return;
    queryClient.prefetchQuery({ queryKey, queryFn });
  }, [hasNextPage, queryKey, queryFn, queryClient]);
}
