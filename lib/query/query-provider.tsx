/**
 * Query Provider
 *
 * Provider component that wraps the app with React Query context.
 * Includes network listeners and optional persistence.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import React, { ReactNode } from "react";

import { useNetworkListeners } from "./network-manager";
import { createFilteredPersister } from "./persister";
import { getQueryClient } from "./query-client";

// ============================================================================
// Configuration
// ============================================================================

const ENABLE_PERSISTENCE = true; // Set to false to disable persistence

// ============================================================================
// Provider Component
// ============================================================================

interface QueryProviderProps {
  children: ReactNode;
  /**
   * Enable/disable cache persistence
   * @default true
   */
  enablePersistence?: boolean;
}

/**
 * Query Provider component
 *
 * Wraps the app with QueryClientProvider and sets up:
 * - Network listeners for online/offline detection
 * - Focus listeners for app state changes
 * - Optional cache persistence
 */
export function QueryProvider({
  children,
  enablePersistence = ENABLE_PERSISTENCE,
}: QueryProviderProps): React.ReactElement {
  // Set up network and focus listeners
  useNetworkListeners();

  const queryClient = getQueryClient();

  // With persistence
  if (enablePersistence) {
    const persister = createFilteredPersister();

    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          buster: "v1", // Increment to invalidate cache on app update
        }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  // Without persistence
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
