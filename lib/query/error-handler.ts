/**
 * Error Handler
 *
 * Global error handling for React Query.
 * Prefers server-provided error messages over generic strings.
 */

import { router } from "expo-router";
import { Alert } from "react-native";

import { ErrorCodes } from "@/lib/api/types";
import { isApiError } from "./retry-strategy";

// ============================================================================
// Fallback Error Messages
// ============================================================================

/**
 * Fallback messages used only when the server doesn't provide one.
 * The server now always returns a meaningful `message` field,
 * so these are last-resort defaults.
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]: "No internet connection. Please check your network.",
  [ErrorCodes.TIMEOUT]: "Request timed out. Please try again.",
  [ErrorCodes.OFFLINE]: "You are offline. Please connect to the internet.",
  [ErrorCodes.UNAUTHORIZED]: "Your session has expired. Please log in again.",
  [ErrorCodes.FORBIDDEN]: "You don't have permission to perform this action.",
  [ErrorCodes.NOT_FOUND]: "The requested resource was not found.",
  [ErrorCodes.BAD_REQUEST]: "Invalid request. Please check your input.",
  [ErrorCodes.VALIDATION_ERROR]: "Please check your input and try again.",
  [ErrorCodes.CONFLICT]: "This action conflicts with existing data.",
  [ErrorCodes.RATE_LIMITED]: "Too many requests. Please wait a moment.",
  [ErrorCodes.INTERNAL_ERROR]: "Something went wrong. Please try again later.",
  [ErrorCodes.SERVICE_UNAVAILABLE]: "Service is temporarily unavailable.",
  [ErrorCodes.UNKNOWN]: "An unexpected error occurred.",
};

// ============================================================================
// Error Handlers
// ============================================================================

/**
 * Get user-friendly error message.
 * Prefers the server's actual message over generic fallbacks.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    // Prefer the server's message — it's always specific and meaningful
    if (error.message) {
      return error.message;
    }
    // Fall back to generic message by error code
    return FALLBACK_MESSAGES[error.code] || FALLBACK_MESSAGES[ErrorCodes.UNKNOWN];
  }

  if (error instanceof Error) {
    return error.message;
  }

  return FALLBACK_MESSAGES[ErrorCodes.UNKNOWN];
}

/**
 * Handle global query errors
 * Called by React Query on error
 */
export function handleQueryError(error: unknown): void {
  if (!isApiError(error)) {
    console.error("Query error:", error);
    return;
  }

  // Handle auth errors - redirect to login
  if (error.code === ErrorCodes.UNAUTHORIZED || error.code === ErrorCodes.TOKEN_EXPIRED) {
    handleUnauthorized();
    return;
  }

  // Log other errors
  console.error(`API Error [${error.code}]:`, error.message, error.details);
}

/**
 * Handle global mutation errors
 * Called by React Query on mutation error
 */
export function handleMutationError(error: unknown): void {
  const message = getErrorMessage(error);

  // Show error alert for mutations
  Alert.alert("Error", message);

  // Also log
  handleQueryError(error);
}

/**
 * Handle unauthorized errors
 */
export function handleUnauthorized(): void {
  // Redirect to login
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace("/(auth)/login");
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.code === ErrorCodes.NETWORK_ERROR;
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === ErrorCodes.UNAUTHORIZED || error.code === ErrorCodes.TOKEN_EXPIRED)
  );
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return isApiError(error) && error.code === ErrorCodes.VALIDATION_ERROR;
}

/**
 * Get validation errors from API error
 */
export function getValidationErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.validationErrors) {
    return {};
  }

  return error.validationErrors.reduce(
    (acc, err) => {
      acc[err.field] = err.message;
      return acc;
    },
    {} as Record<string, string>
  );
}
