/**
 * User Hooks
 *
 * React Query hooks for user management.
 * Types and endpoints match the server's actual API.
 */

import { api } from "@/lib/api";
import { ApiResponse, createQueryKeyFactory } from "@/lib/api/types";

import { useAppMutation, useAppQuery, useOptimisticMutation } from "../queries";

// ============================================================================
// Types (matching server's User model)
// ============================================================================

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullname: string;
  email: string;
  role: string;
  profilePicture?: string;
  expoPushTokens?: string[];
  pushNotificationsEnabled: boolean;
  emailAlertsEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  fullname?: string;
  email?: string;
  expoPushToken?: string;
  pushNotificationsEnabled?: boolean;
  emailAlertsEnabled?: boolean;
}

// ============================================================================
// Server Response Types
// ============================================================================

interface ProfileResponse {
  user: User;
}

interface UserDetailResponse {
  user: User;
  businesses: unknown[];
  sites: unknown[];
  contracts: unknown[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const userKeys = createQueryKeyFactory("users");

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch current authenticated user's profile
 * Server endpoint: GET /api/auth/profile (requires auth token)
 *
 * @example
 * ```tsx
 * const { data, isLoading, errorMessage } = useCurrentUser();
 *
 * if (isLoading) return <Loading />;
 * if (errorMessage) return <Error message={errorMessage} />;
 * return <Text>Hello, {data?.user.fullname}!</Text>;
 * ```
 */
export function useCurrentUser() {
  return useAppQuery<ApiResponse<ProfileResponse>>(
    userKeys.detail("me"),
    () => api.get<ApiResponse<ProfileResponse>>("/api/auth/profile")
  );
}

/**
 * Fetch user by ID
 * Server endpoint: GET /api/users/:id (requires auth + authorization)
 *
 * @example
 * ```tsx
 * const { data: response, isLoading } = useUser(userId);
 * const user = response?.data?.user;
 * ```
 */
export function useUser(userId: string) {
  return useAppQuery<ApiResponse<UserDetailResponse>>(
    userKeys.detail(userId),
    () => api.get<ApiResponse<UserDetailResponse>>(`/api/users/${userId}`),
    {
      enabled: !!userId,
    }
  );
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update user profile
 * Server endpoint: PUT /api/users/:id (requires auth + authorization)
 *
 * @example
 * ```tsx
 * const updateUser = useUpdateUser(userId);
 *
 * const handleSubmit = (data: UpdateUserInput) => {
 *   updateUser.mutate(data, {
 *     onSuccess: () => Alert.alert('Success', 'Profile updated!'),
 *   });
 * };
 * ```
 */
export function useUpdateUser(userId: string) {
  return useAppMutation<ApiResponse<{ user: User }>, UpdateUserInput>(
    (input) => api.put<ApiResponse<{ user: User }>>(`/api/users/${userId}`, input),
    {
      invalidateKeys: [userKeys.detail(userId), userKeys.detail("me")],
    }
  );
}

/**
 * Update user with optimistic update
 *
 * @example
 * ```tsx
 * const updateUser = useOptimisticUpdateUser(userId);
 * updateUser.mutate({ fullname: 'New Name' });
 * ```
 */
export function useOptimisticUpdateUser(userId: string) {
  return useOptimisticMutation<ApiResponse<{ user: User }>, UpdateUserInput>(
    (input) => api.put<ApiResponse<{ user: User }>>(`/api/users/${userId}`, input),
    {
      queryKey: userKeys.detail(userId),
      getOptimisticData: (input, current) => ({
        ...current!,
        data: {
          ...current!.data,
          user: {
            ...current!.data.user,
            ...input,
          },
        },
      }),
    }
  );
}

/**
 * Change password
 * Server endpoint: PUT /api/users/change-password/:id
 *
 * @example
 * ```tsx
 * const changePassword = useChangePassword(userId);
 * changePassword.mutate({ oldPassword: 'old', newPassword: 'new' });
 * ```
 */
export function useChangePassword(userId: string) {
  return useAppMutation<ApiResponse<null>, { oldPassword: string; newPassword: string }>(
    (input) => api.put<ApiResponse<null>>(`/api/users/change-password/${userId}`, input),
    {}
  );
}

/**
 * Delete user account
 * Server endpoint: DELETE /api/users/:id
 */
export function useDeleteAccount(userId: string) {
  return useAppMutation<ApiResponse<null>, void>(
    () => api.delete<ApiResponse<null>>(`/api/users/${userId}`),
    {}
  );
}

export default useCurrentUser;
