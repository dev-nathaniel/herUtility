/**
 * API Client
 *
 * Base API client with request/response interceptors, auth handling,
 * and error normalization. Uses native fetch for React Native compatibility.
 */

import { ApiError, ErrorCodes, FetchOptions } from "./types";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com";

interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  getAuthToken: () => Promise<string | null>;
  onUnauthorized: () => void;
  onTokenRefresh?: () => Promise<string | null>;
}

// Default configuration - override via setConfig
let config: ApiClientConfig = {
  baseUrl: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  getAuthToken: async () => null,
  onUnauthorized: () => {
    console.warn("Unauthorized request - no handler configured");
  },
};

/**
 * Configure the API client
 * Call this at app initialization to set up auth handlers
 */
export function configureApiClient(newConfig: Partial<ApiClientConfig>): void {
  config = { ...config, ...newConfig };
}

// ============================================================================
// Request Building
// ============================================================================

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(endpoint, config.baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

function buildHeaders(options: FetchOptions, authToken: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

// ============================================================================
// Error Handling
// ============================================================================

function createApiError(statusCode: number, message: string, details?: Record<string, unknown>): ApiError {
  const codeMap: Record<number, string> = {
    400: ErrorCodes.BAD_REQUEST,
    401: ErrorCodes.UNAUTHORIZED,
    403: ErrorCodes.FORBIDDEN,
    404: ErrorCodes.NOT_FOUND,
    409: ErrorCodes.CONFLICT,
    422: ErrorCodes.VALIDATION_ERROR,
    429: ErrorCodes.RATE_LIMITED,
    500: ErrorCodes.INTERNAL_ERROR,
    503: ErrorCodes.SERVICE_UNAVAILABLE,
  };

  const code = codeMap[statusCode] || ErrorCodes.UNKNOWN;

  return {
    code,
    message,
    statusCode,
    details,
  };
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return createApiError(
      response.status,
      data.message || data.error || response.statusText,
      data.details
    );
  } catch {
    return createApiError(response.status, response.statusText);
  }
}

// ============================================================================
// Core Request Function
// ============================================================================

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, params, timeout = config.timeout, signal, skipAuth = false } = options;

  // Get auth token
  const authToken = skipAuth ? null : await config.getAuthToken();

  // Build request
  const url = buildUrl(endpoint, params);
  const headers = buildHeaders(options, authToken);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine with external signal if provided
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle unauthorized - attempt token refresh
    if (response.status === 401) {
      // For public auth endpoints (skipAuth), don't trigger session-clearing
      // logic — a 401 here just means invalid credentials, not an expired session.
      if (!skipAuth) {
        if (config.onTokenRefresh) {
          const newToken = await config.onTokenRefresh();
          if (newToken) {
            // Retry request with new token
            return request(endpoint, { ...options, skipAuth: false });
          }
        }
        config.onUnauthorized();
      }
      throw await parseErrorResponse(response);
    }

    // Handle error responses
    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // Handle empty responses
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw createApiError(0, "Request timeout", { code: ErrorCodes.TIMEOUT });
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === "Network request failed") {
      throw {
        code: ErrorCodes.NETWORK_ERROR,
        message: "Network request failed. Please check your connection.",
        statusCode: 0,
      } as ApiError;
    }

    // Re-throw API errors
    if ((error as ApiError).code) {
      throw error;
    }

    // Handle unknown errors
    throw createApiError(0, error instanceof Error ? error.message : "Unknown error");
  }
}

// ============================================================================
// HTTP Method Helpers
// ============================================================================

export const api = {
  get: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export default api;
