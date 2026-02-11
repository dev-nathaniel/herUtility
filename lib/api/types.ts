/**
 * API Types
 *
 * Type definitions for API requests, responses, and error handling.
 * These types match the server's standardized response format.
 */

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API response wrapper
 * All server responses follow this structure:
 *   Success: { success: true, message: "...", data: T }
 *   Error:   { success: false, message: "..." }
 */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/**
 * Paginated response for list endpoints
 * The server returns data + pagination metadata inside `data`
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  OFFLINE: "OFFLINE",

  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Client errors
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",

  // Unknown
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Request Types
// ============================================================================

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  skipAuth?: boolean;
  retries?: number;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface FetchOptions extends RequestConfig {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

// ============================================================================
// Query Key Types
// ============================================================================

/**
 * Query key factory pattern for type-safe query keys
 */
export type QueryKeyFactory<T extends string> = {
  all: readonly [T];
  lists: readonly [T, "list"];
  list: (filters?: Record<string, unknown>) => readonly [T, "list", Record<string, unknown>?];
  details: readonly [T, "detail"];
  detail: (id: string | number) => readonly [T, "detail", string | number];
};

/**
 * Create a query key factory for a given entity
 */
export function createQueryKeyFactory<T extends string>(entity: T): QueryKeyFactory<T> {
  return {
    all: [entity] as const,
    lists: [entity, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? ([entity, "list", filters] as const) : ([entity, "list"] as const),
    details: [entity, "detail"] as const,
    detail: (id: string | number) => [entity, "detail", id] as const,
  };
}

// ============================================================================
// Mutation Types
// ============================================================================

export interface MutationContext<T> {
  previousData?: T;
  optimisticData?: T;
}

export interface OptimisticUpdateConfig<TData, TVariables> {
  getOptimisticData: (variables: TVariables, currentData?: TData) => TData;
  rollbackOnError?: boolean;
}
