/**
 * usePrefetch
 *
 * Utilities for prefetching data before navigation or user interaction.
 * Improves perceived performance by loading data in advance.
 */

import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface PrefetchOptions {
  /**
   * Stale time for prefetched data (how long to wait before refetching)
   * @default 60000 (1 minute)
   */
  staleTime?: number;

  /**
   * Whether to force refetch even if data exists
   * @default false
   */
  forceRefetch?: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to prefetch a single query
 *
 * @example
 * ```tsx
 * const prefetchUser = usePrefetch(['user', userId], () => api.get(`/users/${userId}`));
 *
 * // Prefetch on component mount
 * useEffect(() => {
 *   prefetchUser();
 * }, []);
 *
 * // Or on user interaction
 * <TouchableOpacity onPress={() => { prefetchUser(); navigation.navigate('Profile'); }}>
 *   <Text>View Profile</Text>
 * </TouchableOpacity>
 * ```
 */
export function usePrefetch<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: PrefetchOptions = {}
): () => Promise<void> {
  const queryClient = useQueryClient();
  const { staleTime = 60000, forceRefetch = false } = options;

  return useCallback(async () => {
    // Check if we already have fresh data
    if (!forceRefetch) {
      const existingData = queryClient.getQueryData(queryKey);
      const queryState = queryClient.getQueryState(queryKey);

      if (existingData && queryState?.dataUpdatedAt) {
        const age = Date.now() - queryState.dataUpdatedAt;
        if (age < staleTime) {
          return; // Data is still fresh
        }
      }
    }

    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
  }, [queryClient, queryKey, queryFn, staleTime, forceRefetch]);
}

/**
 * Hook to prefetch multiple queries at once
 *
 * @example
 * ```tsx
 * const prefetchProfileData = usePrefetchMultiple([
 *   { queryKey: ['user', userId], queryFn: () => api.get(`/users/${userId}`) },
 *   { queryKey: ['posts', userId], queryFn: () => api.get(`/users/${userId}/posts`) },
 * ]);
 *
 * // Prefetch all profile-related data
 * prefetchProfileData();
 * ```
 */
export function usePrefetchMultiple(
  queries: Array<{ queryKey: QueryKey; queryFn: () => Promise<unknown> }>,
  options: PrefetchOptions = {}
): () => Promise<void> {
  const queryClient = useQueryClient();
  const { staleTime = 60000 } = options;

  return useCallback(async () => {
    await Promise.all(
      queries.map(({ queryKey, queryFn }) =>
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime,
        })
      )
    );
  }, [queryClient, queries, staleTime]);
}

/**
 * Hook for navigation-based prefetching
 * Returns handlers for touch events that trigger prefetch
 *
 * @example
 * ```tsx
 * const { onPressIn, onPress } = useNavigationPrefetch(
 *   ['profile', userId],
 *   () => api.get(`/users/${userId}`),
 *   () => navigation.navigate('Profile', { userId })
 * );
 *
 * <TouchableOpacity onPressIn={onPressIn} onPress={onPress}>
 *   <Text>View Profile</Text>
 * </TouchableOpacity>
 * ```
 */
export function useNavigationPrefetch<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  onNavigate: () => void,
  options: PrefetchOptions = {}
): {
  onPressIn: () => void;
  onPress: () => void;
} {
  const prefetch = usePrefetch(queryKey, queryFn, options);

  return {
    onPressIn: useCallback(() => {
      // Start prefetching when user touches down
      prefetch();
    }, [prefetch]),

    onPress: useCallback(() => {
      // Navigate on press
      onNavigate();
    }, [onNavigate]),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Prefetch query using query client directly
 * Use this outside of React components
 */
export async function prefetchQuery<TData>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  staleTime: number = 60000
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime,
  });
}

export default usePrefetch;
