/**
 * Query Client
 *
 * QueryClient configuration with production-ready defaults.
 * Includes retry logic, error handling, and optimized settings.
 */

import { QueryClient } from "@tanstack/react-query";

import { handleMutationError } from "./error-handler";
import { getRetryDelay, retryCheck } from "./retry-strategy";

// ============================================================================
// Configuration
// ============================================================================

const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
const GC_TIME_MS = 1000 * 60 * 30; // 30 minutes
const MAX_RETRIES = 3;

// ============================================================================
// Query Client Factory
// ============================================================================

/**
 * Create a configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - how long data is considered fresh
        staleTime: STALE_TIME_MS,

        // GC time - how long unused data stays in cache
        gcTime: GC_TIME_MS,

        // Retry configuration
        retry: (failureCount, error) => retryCheck(failureCount, error),
        retryDelay: (failureCount, error) => getRetryDelay(failureCount, error),

        // Refetch behavior
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Network mode - offlineFirst for better offline UX
        networkMode: "offlineFirst",

        // Error handling - don't throw, let components handle errors
        throwOnError: false,
      },

      mutations: {
        // Retry mutations (typically you don't want to retry mutations)
        retry: false,

        // Global mutation error handler
        onError: handleMutationError,

        // Network mode
        networkMode: "offlineFirst",

        // Error handling
        throwOnError: false,
      },
    },
  });
}

// ============================================================================
// Singleton Instance
// ============================================================================

let queryClient: QueryClient | null = null;

/**
 * Get or create the QueryClient singleton
 */
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

/**
 * Reset the QueryClient (useful for logout)
 */
export function resetQueryClient(): void {
  if (queryClient) {
    queryClient.clear();
  }
}

/**
 * Invalidate all queries (useful after login)
 */
export async function invalidateAllQueries(): Promise<void> {
  if (queryClient) {
    await queryClient.invalidateQueries();
  }
}
