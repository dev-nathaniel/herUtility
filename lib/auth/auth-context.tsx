/**
 * Auth Context
 *
 * Provides authentication state and actions to the whole app.
 * Configures the API client with token handlers on mount.
 */

import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, configureApiClient } from "@/lib/api";
import type { ApiResponse } from "@/lib/api/types";
import { resetQueryClient } from "@/lib/query/query-client";
import {
  clearAllAuthData,
  getAccessToken,
  getRefreshToken,
  getUser,
  saveAccessToken,
  saveTokens,
  saveUser,
} from "./auth-storage";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullname: string;
  email: string;
  role: string;
  profilePicture?: string;
  expoPushTokens?: string[];
  pushNotificationsEnabled: boolean;
}

interface LoginResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    fullname: string;
    email: string;
    role: string;
    profilePicture?: string;
    expoPushTokens?: string[];
    pushNotificationsEnabled: boolean;
  };
  token: string;
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const isLoggingOut = React.useRef(false);
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // ------------------------------------------------------------------
  // Token refresh handler (called by api-client on 401)
  // ------------------------------------------------------------------
  const handleTokenRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000"}/api/auth/refresh-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = (await response.json()) as ApiResponse<RefreshResponse>;
      if (data.success && data.data?.token) {
        await saveAccessToken(data.data.token);
        return data.data.token;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Unauthorized handler (called by api-client when auth fails)
  // ------------------------------------------------------------------
  const handleUnauthorized = useCallback(async () => {
    if (isLoggingOut.current) return;
    
    await clearAllAuthData();
    resetQueryClient();
    setState({ user: null, isAuthenticated: false, isLoading: false });
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace("/(auth)/login");
  }, [router]);

  // ------------------------------------------------------------------
  // Configure api-client on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    configureApiClient({
      getAuthToken: getAccessToken,
      onTokenRefresh: handleTokenRefresh,
      onUnauthorized: handleUnauthorized,
    });
  }, [handleTokenRefresh, handleUnauthorized]);

  // ------------------------------------------------------------------
  // Restore session from storage on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const [token, user] = await Promise.all([
          getAccessToken(),
          getUser<AuthUser>(),
        ]);

        if (token && user) {
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    })();
  }, []);

  // ------------------------------------------------------------------
  // Auth Actions
  // ------------------------------------------------------------------

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<ApiResponse<LoginResponse>>(
        "/api/auth/login",
        { email, password },
        { skipAuth: true }
      );


      if (!response.success || !response.data) {
      console.log(response);
        throw new Error(response.message || "Login failed");
      }

      const { user, token, refreshToken } = response.data;
      const authUser: AuthUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        expoPushTokens: user.expoPushTokens,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
      };

      await saveTokens(token, refreshToken);
      await saveUser(authUser);

      setState({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    []
  );

  const register = useCallback(
    async (firstName: string, lastName: string, email: string, password: string) => {
      const response = await api.post<ApiResponse<LoginResponse>>(
        "/api/auth/register",
        { firstName, lastName, email, password },
        { skipAuth: true }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Registration failed");
      }

      const { user, token, refreshToken } = response.data;
      const authUser: AuthUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        expoPushTokens: user.expoPushTokens,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
      };

      await saveTokens(token, refreshToken);
      await saveUser(authUser);

      setState({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    isLoggingOut.current = true;
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        // Call server logout to invalidate refresh token
        await api
          .post("/api/auth/logout", undefined, {
            skipAuth: true,
            headers: { Authorization: `Bearer ${refreshToken}` },
          })
          .catch(() => {
            // Ignore errors — we're logging out regardless
          });
      }
    } finally {
      await clearAllAuthData();
      resetQueryClient();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/(auth)/login");

      // Reset flag after navigation (short delay)
      setTimeout(() => {
        isLoggingOut.current = false;
      }, 500);
    }
  }, [router]);

  const updateUser = useCallback((user: AuthUser) => {
    setState((prev) => ({ ...prev, user }));
    saveUser(user);
  }, []);

  // ------------------------------------------------------------------
  // Memoized context value
  // ------------------------------------------------------------------

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateUser,
    }),
    [state, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
