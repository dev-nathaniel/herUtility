/**
 * Persister
 *
 * AsyncStorage-based persistence for React Query cache.
 * Allows queries to be restored on app restart.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

// ============================================================================
// Configuration
// ============================================================================

const STORAGE_KEY = "REACT_QUERY_CACHE";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

// ============================================================================
// AsyncStorage Persister
// ============================================================================

/**
 * Create an AsyncStorage-based persister for React Query
 */
export function createAsyncStoragePersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(client));
      } catch (error) {
        console.warn("Failed to persist query cache:", error);
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return undefined;

        const client = JSON.parse(data) as PersistedClient;

        // Check if cache is too old
        const age = Date.now() - client.timestamp;
        if (age > MAX_AGE_MS) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          return undefined;
        }

        return client;
      } catch (error) {
        console.warn("Failed to restore query cache:", error);
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn("Failed to remove query cache:", error);
      }
    },
  };
}

// ============================================================================
// Selective Persistence
// ============================================================================

/**
 * Filter function to determine which queries should be persisted
 * Use this to exclude sensitive or large data from persistence
 */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  // Don't persist user-specific sensitive data
  const sensitiveKeys = ["auth", "session", "token"];
  const keyString = JSON.stringify(queryKey);

  for (const sensitive of sensitiveKeys) {
    if (keyString.includes(sensitive)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a filtered persister that only persists certain queries
 */
export function createFilteredPersister(): Persister {
  const basePersister = createAsyncStoragePersister();

  return {
    persistClient: async (client: PersistedClient) => {
      // Filter out queries that shouldn't be persisted
      const filteredClient: PersistedClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: client.clientState.queries.filter((query) =>
            shouldPersistQuery(query.queryKey)
          ),
        },
      };

      return basePersister.persistClient(filteredClient);
    },

    restoreClient: basePersister.restoreClient,
    removeClient: basePersister.removeClient,
  };
}
