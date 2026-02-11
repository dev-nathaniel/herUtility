/**
 * useAppQuery
 *
 * Base query hook wrapper with enhanced error handling and loading states.
 * Provides a consistent interface for all queries in the app.
 */

import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/types";
import { getErrorMessage, isNetworkError } from "@/lib/query/error-handler";

// ============================================================================
// Types
// ============================================================================

export interface UseAppQueryOptions<TData, TError = ApiError>
  extends Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn"> {
  /**
   * Show error toast on error
   * @default false
   */
  showErrorToast?: boolean;

  /**
   * Custom error handler
   */
  onQueryError?: (error: TError) => void;

  /**
   * Custom success handler
   */
  onQuerySuccess?: (data: TData) => void;
}

export interface UseAppQueryResult<TData, TError = ApiError> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  isPending: boolean;
  refetch: () => void;
  /**
   * User-friendly error message
   */
  errorMessage: string | null;

  /**
   * Whether the query is offline
   */
  isOffline: boolean;

  /**
   * Whether the query has cached data (even if stale)
   */
  hasCachedData: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Enhanced query hook with better error handling and utility properties
 *
 * @example
 * ```tsx
 * const { data, isLoading, errorMessage } = useAppQuery(
 *   ['users', userId],
 *   () => api.get(`/users/${userId}`),
 *   { enabled: !!userId }
 * );
 *
 * if (isLoading) return <Loading />;
 * if (errorMessage) return <Error message={errorMessage} />;
 * return <UserProfile user={data} />;
 * ```
 */
export function useAppQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: UseAppQueryOptions<TData, TError> = {}
): UseAppQueryResult<TData, TError> {
  const { showErrorToast = false, onQueryError, onQuerySuccess, ...queryOptions } = options;

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...queryOptions,
  });

  // Handle success callback
  if (query.isSuccess && query.data && onQuerySuccess) {
    onQuerySuccess(query.data);
  }

  // Handle error callback
  if (query.isError && query.error && onQueryError) {
    onQueryError(query.error);
  }

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isPending: query.isPending,
    refetch: query.refetch,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
    isOffline: query.error ? isNetworkError(query.error) : false,
    hasCachedData: query.data !== undefined,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook that only fetches when the component is focused
 * Useful for screens that should refresh when navigated to
 */
export function useFocusedQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: UseAppQueryOptions<TData, TError> = {}
): UseAppQueryResult<TData, TError> {
  return useAppQuery(queryKey, queryFn, {
    ...options,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook that never refetches automatically
 * Useful for static data that doesn't change
 */
export function useStaticQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: UseAppQueryOptions<TData, TError> = {}
): UseAppQueryResult<TData, TError> {
  return useAppQuery(queryKey, queryFn, {
    ...options,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export default useAppQuery;
