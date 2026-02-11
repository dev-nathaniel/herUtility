/**
 * Network Manager
 *
 * React Native network state management for React Query.
 * Handles online/offline detection and app state focus.
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

// ============================================================================
// Online Manager
// ============================================================================

/**
 * Setup online manager to detect network state changes
 * This pauses/resumes queries based on network connectivity
 */
export function setupOnlineManager(): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected !== null && state.isConnected && Boolean(state.isInternetReachable);
    onlineManager.setOnline(isOnline);
  });
}

/**
 * Get current online status
 */
export async function getIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== null && state.isConnected && Boolean(state.isInternetReachable);
}

// ============================================================================
// Focus Manager
// ============================================================================

/**
 * Setup focus manager to detect app state changes
 * This triggers refetch when app comes to foreground
 */
export function setupFocusManager(): () => void {
  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== "web") {
      focusManager.setFocused(status === "active");
    }
  };

  const subscription = AppState.addEventListener("change", onAppStateChange);

  // Return cleanup function
  return () => subscription.remove();
}

// ============================================================================
// Hook for Network Status
// ============================================================================

/**
 * Hook to subscribe to network state changes
 * Use this to show offline banners or disable features
 */
export function useOnlineStatus(): boolean {
  return onlineManager.isOnline();
}

/**
 * Hook to set up network listeners
 * Call this once at app root
 */
export function useNetworkListeners(): void {
  useEffect(() => {
    const unsubscribeOnline = setupOnlineManager();
    const unsubscribeFocus = setupFocusManager();

    return () => {
      unsubscribeOnline();
      unsubscribeFocus();
    };
  }, []);
}
