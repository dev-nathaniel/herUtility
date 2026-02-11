/**
 * useAppMutation
 *
 * Base mutation hook wrapper with optimistic updates, error handling, and cache invalidation.
 * Provides a consistent interface for all mutations in the app.
 */

import { QueryKey, useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/types";
import { getErrorMessage, getValidationErrors } from "@/lib/query/error-handler";

// ============================================================================
// Types
// ============================================================================

export interface UseAppMutationOptions<TData, TVariables, TError = ApiError, TContext = unknown>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn"> {
  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: QueryKey[];

  /**
   * Show success toast on success
   * @default false
   */
  showSuccessToast?: boolean;

  /**
   * Success toast message
   */
  successMessage?: string;

  /**
   * Show error toast on error
   * @default true (handled globally)
   */
  showErrorToast?: boolean;
}

export interface UseAppMutationResult<TData, TVariables, TError = ApiError> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
  /**
   * User-friendly error message
   */
  errorMessage: string | null;

  /**
   * Validation errors by field
   */
  validationErrors: Record<string, string>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Enhanced mutation hook with cache invalidation and error handling
 *
 * @example
 * ```tsx
 * const updateUser = useAppMutation(
 *   (data) => api.patch('/users/me', data),
 *   {
 *     invalidateKeys: [['users', 'me']],
 *     onSuccess: () => navigation.goBack(),
 *   }
 * );
 *
 * const handleSubmit = () => {
 *   updateUser.mutate({ name: 'New Name' });
 * };
 * ```
 */
export function useAppMutation<TData, TVariables, TError = ApiError, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseAppMutationOptions<TData, TVariables, TError, TContext> = {}
): UseAppMutationResult<TData, TVariables, TError> {
  const queryClient = useQueryClient();
  const { invalidateKeys, showSuccessToast, successMessage, ...mutationOptions } = options;

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      if (invalidateKeys) {
        await Promise.all(invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
      }

      // Call original onSuccess if provided (cast to avoid overload issues)
      const successHandler = mutationOptions.onSuccess as
        | ((data: TData, variables: TVariables, context: TContext) => void)
        | undefined;
      successHandler?.(data, variables, context);
    },
    onError: mutationOptions.onError,
    onMutate: mutationOptions.onMutate,
    onSettled: mutationOptions.onSettled,
    retry: mutationOptions.retry,
    retryDelay: mutationOptions.retryDelay,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    data: mutation.data,
    error: mutation.error,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    validationErrors: mutation.error ? getValidationErrors(mutation.error) : {},
  };
}

// ============================================================================
// Optimistic Update Hook
// ============================================================================

export interface OptimisticMutationOptions<TData, TVariables, TError = ApiError>
  extends UseAppMutationOptions<TData, TVariables, TError, { previousData: TData | undefined }> {
  /**
   * Query key for the data to update optimistically
   */
  queryKey: QueryKey;

  /**
   * Function to generate optimistic data
   */
  getOptimisticData: (variables: TVariables, currentData: TData | undefined) => TData;
}

/**
 * Mutation hook with built-in optimistic updates
 *
 * @example
 * ```tsx
 * const toggleLike = useOptimisticMutation(
 *   (postId) => api.post(`/posts/${postId}/like`),
 *   {
 *     queryKey: ['posts', postId],
 *     getOptimisticData: (postId, currentPost) => ({
 *       ...currentPost,
 *       isLiked: !currentPost.isLiked,
 *       likeCount: currentPost.isLiked
 *         ? currentPost.likeCount - 1
 *         : currentPost.likeCount + 1,
 *     }),
 *   }
 * );
 * ```
 */
export function useOptimisticMutation<TData, TVariables, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticMutationOptions<TData, TVariables, TError>
): UseAppMutationResult<TData, TVariables, TError> {
  const queryClient = useQueryClient();
  const { queryKey, getOptimisticData, ...mutationOptions } = options;

  const mutation = useMutation<TData, TError, TVariables, { previousData: TData | undefined }>({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      const optimisticData = getOptimisticData(variables, previousData);
      queryClient.setQueryData<TData>(queryKey, optimisticData);

      // Return context with the snapshot
      return { previousData };
    },

    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: async () => {
      // Refetch after error or success to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey });
    },

    ...mutationOptions,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    data: mutation.data,
    error: mutation.error,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    validationErrors: mutation.error ? getValidationErrors(mutation.error) : {},
  };
}

export default useAppMutation;
