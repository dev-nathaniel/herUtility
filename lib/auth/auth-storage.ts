/**
 * Auth Storage
 *
 * Persists auth tokens and user data using AsyncStorage.
 * For production, consider migrating to expo-secure-store for token storage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: "@auth/access_token",
  REFRESH_TOKEN: "@auth/refresh_token",
  USER: "@auth/user",
} as const;

// ============================================================================
// Token Storage
// ============================================================================

export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function saveAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);
}

// ============================================================================
// User Storage
// ============================================================================

export async function saveUser(user: object): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function getUser<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER);
}

// ============================================================================
// Clear All Auth Data
// ============================================================================

export async function clearAllAuthData(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
}
