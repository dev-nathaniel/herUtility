/**
 * Retry Strategy
 *
 * Smart retry logic with exponential backoff and jitter.
 * Handles different error types appropriately.
 */

import { ApiError, ErrorCodes } from "@/lib/api/types";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

// Errors that should NOT be retried
const NON_RETRYABLE_ERRORS: Set<string> = new Set([
  ErrorCodes.BAD_REQUEST,
  ErrorCodes.UNAUTHORIZED,
  ErrorCodes.FORBIDDEN,
  ErrorCodes.NOT_FOUND,
  ErrorCodes.VALIDATION_ERROR,
  ErrorCodes.CONFLICT,
]);

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Determines if an error should be retried
 */
export function shouldRetry(error: unknown, failureCount: number): boolean {
  // Max retries exceeded
  if (failureCount >= DEFAULT_MAX_RETRIES) {
    return false;
  }

  // Check if it's an API error with a non-retryable code
  if (isApiError(error) && NON_RETRYABLE_ERRORS.has(error.code)) {
    return false;
  }

  // Retry for network errors
  if (isApiError(error) && error.code === ErrorCodes.NETWORK_ERROR) {
    return true;
  }

  // Retry for timeout errors
  if (isApiError(error) && error.code === ErrorCodes.TIMEOUT) {
    return true;
  }

  // Retry for server errors (5xx)
  if (isApiError(error) && error.statusCode >= 500) {
    return true;
  }

  // Retry for rate limiting with backoff
  if (isApiError(error) && error.code === ErrorCodes.RATE_LIMITED) {
    return true;
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Calculates retry delay with exponential backoff and jitter
 */
export function getRetryDelay(failureCount: number, error?: unknown): number {
  // Rate limited - check for Retry-After header value
  if (isApiError(error) && error.code === ErrorCodes.RATE_LIMITED) {
    const retryAfter = error.details?.retryAfter;
    if (typeof retryAfter === "number") {
      return retryAfter * 1000;
    }
  }

  // Exponential backoff: 1s, 2s, 4s, 8s...
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, failureCount);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Cap at max delay
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

/**
 * Combined retry check for React Query
 */
export function retryCheck(failureCount: number, error: unknown): boolean {
  return shouldRetry(error, failureCount);
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "statusCode" in error &&
    "message" in error
  );
}
