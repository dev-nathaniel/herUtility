/**
 * API Layer Exports
 */

import { getAccessToken } from "../auth/auth-storage";
import { configureApiClient } from "./api-client";

// Configure token getter immediately to avoid race conditions
configureApiClient({
  getAuthToken: getAccessToken,
});

export { api, default as apiClient, configureApiClient } from "./api-client";
export * from "./types";

