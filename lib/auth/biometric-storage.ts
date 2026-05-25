import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
export const LAST_LOGGED_IN_USER_KEY = 'last_logged_in_user';

export async function saveBiometricCredentials(email: string, password: string):Promise<void> {
    try {
        const credentials = JSON.stringify({ email, password });
        await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    } catch (e) {
        console.error('Failed to save biometric credentials', e);
    }
}

export async function getBiometricCredentials(): Promise<{email: string, password: string} | null> {
    try {
        const credentialsStr = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        if (credentialsStr) {
            return JSON.parse(credentialsStr);
        }
    } catch (e) {
        console.error('Failed to get biometric credentials', e);
    }
    return null;
}

export async function clearBiometricCredentials(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        await AsyncStorage.removeItem(LAST_LOGGED_IN_USER_KEY);
    } catch (e) {
        console.error('Failed to clear biometric credentials', e);
    }
}

export async function saveLastLoggedInUser(user: any): Promise<void> {
    try {
        await AsyncStorage.setItem(LAST_LOGGED_IN_USER_KEY, JSON.stringify(user));
    } catch (e) {
        console.error('Failed to save last logged in user', e);
    }
}

export async function getLastLoggedInUser(): Promise<any | null> {
    try {
        const userStr = await AsyncStorage.getItem(LAST_LOGGED_IN_USER_KEY);
        if (userStr) {
            return JSON.parse(userStr);
        }
    } catch (e) {
        console.error('Failed to get last logged in user', e);
    }
    return null;
}
