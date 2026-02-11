/**
 * useAppInfiniteQuery
 *
 * Infinite query hook for paginated lists with FlatList integration.
 * Handles page-based pagination matching the server's pagination utility.
 */

import { InfiniteData, QueryKey, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { ApiError, PaginatedResponse } from "@/lib/api/types";
import { getErrorMessage, isNetworkError } from "@/lib/query/error-handler";

// ============================================================================
// Types
// ============================================================================

export type PageParam = string | number | null;

export interface UseAppInfiniteQueryResult<TData, TError = ApiError> {
  data: InfiniteData<TData> | undefined;
  error: TError | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  /**
   * Flattened data array from all pages
   */
  flatData: TData extends { data: infer U extends unknown[] } ? U : TData[];

  /**
   * User-friendly error message
   */
  errorMessage: string | null;

  /**
   * Whether the query is offline
   */
  isOffline: boolean;

  /**
   * Props for FlatList integration
   */
  flatListProps: {
    onEndReached: () => void;
    onEndReachedThreshold: number;
    onRefresh: () => void;
    refreshing: boolean;
  };
}

// ============================================================================
// Page-Based Pagination Hook
// ============================================================================

/**
 * Infinite query hook for page-based pagination
 *
 * @example
 * ```tsx
 * const { flatData, flatListProps } = usePagedInfiniteQuery(
 *   ['users'],
 *   async (page) => api.get('/users', { params: { page, pageSize: 20 } })
 * );
 *
 * return (
 *   <FlatList
 *     data={flatData}
 *     renderItem={renderUser}
 *     {...flatListProps}
 *   />
 * );
 * ```
 */
export function usePagedInfiniteQuery<TItem, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: (page: number) => Promise<PaginatedResponse<TItem>>,
  options: { enabled?: boolean; staleTime?: number } = {}
): UseAppInfiniteQueryResult<PaginatedResponse<TItem>, TError> {
  const query = useInfiniteQuery<
    PaginatedResponse<TItem>,
    TError,
    InfiniteData<PaginatedResponse<TItem>>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    ...options,
  });

  const flatData = query.data?.pages.flatMap((page) => page.data) ?? [];

  const handleEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const handleRefresh = useCallback(() => {
    query.refetch();
  }, [query.refetch]);

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    flatData: flatData as UseAppInfiniteQueryResult<PaginatedResponse<TItem>, TError>["flatData"],
    errorMessage: query.error ? getErrorMessage(query.error) : null,
    isOffline: query.error ? isNetworkError(query.error) : false,
    flatListProps: {
      onEndReached: handleEndReached,
      onEndReachedThreshold: 0.5,
      onRefresh: handleRefresh,
      refreshing: query.isRefetching && !query.isFetchingNextPage,
    },
  };
}

export default usePagedInfiniteQuery;
