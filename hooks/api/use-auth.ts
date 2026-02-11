/**
 * Auth Hooks
 *
 * Mutation hooks for auth-related API calls that don't go through
 * the auth context (forgot-password, verify-otp, reset-password).
 *
 * Login and register are handled directly by the AuthContext because
 * they need to update auth state (tokens + user).
 */

import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api/types";

import { useAppMutation } from "../queries";

// ============================================================================
// Types
// ============================================================================

interface ForgotPasswordInput {
  email: string;
}

interface VerifyOtpInput {
  email: string;
  otp: string;
}

interface ResetPasswordInput {
  email: string;
  newPassword: string;
}

interface CheckEmailInput {
  email: string;
}

interface CheckEmailResponse {
  email: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Check if email already exists
 * Server endpoint: POST /api/auth/check-email
 */
export function useCheckEmail() {
  return useAppMutation<ApiResponse<CheckEmailResponse>, CheckEmailInput>(
    (input) => api.post<ApiResponse<CheckEmailResponse>>("/api/auth/check-email", input),
    {}
  );
}

/**
 * Send forgot password OTP
 * Server endpoint: POST /api/auth/forgot-password
 */
export function useForgotPassword() {
  return useAppMutation<ApiResponse<null>, ForgotPasswordInput>(
    (input) => api.post<ApiResponse<null>>("/api/auth/forgot-password", input),
    {}
  );
}

/**
 * Verify OTP code
 * Server endpoint: POST /api/auth/verify-otp
 */
export function useVerifyOtp() {
  return useAppMutation<ApiResponse<null>, VerifyOtpInput>(
    (input) => api.post<ApiResponse<null>>("/api/auth/verify-otp", input),
    {}
  );
}

/**
 * Reset password after OTP verification
 * Server endpoint: POST /api/auth/reset-password
 */
export function useResetPassword() {
  return useAppMutation<ApiResponse<null>, ResetPasswordInput>(
    (input) => api.post<ApiResponse<null>>("/api/auth/reset-password", input),
    {}
  );
}
