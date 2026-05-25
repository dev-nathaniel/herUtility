import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BiometricModal } from '@/components/auth/BiometricModal';
import { useAuth } from '@/lib/auth/auth-context';
import { clearBiometricCredentials, getBiometricCredentials, getLastLoggedInUser } from '@/lib/auth/biometric-storage';

export default function QuickLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [authType, setAuthType] = useState<'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    async function loadData() {
      const lastUser = await getLastLoggedInUser();
      if (!lastUser) {
        router.replace('/(auth)/login');
        return;
      }
      setUser(lastUser);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();

      if (hasHardware) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setAuthType('FACIAL_RECOGNITION');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setAuthType('FINGERPRINT');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setAuthType('IRIS');
        } else {
          setAuthType(Platform.OS === 'ios' ? 'FACIAL_RECOGNITION' : 'FINGERPRINT');
        }
      } else {
        setAuthType(Platform.OS === 'ios' ? 'FACIAL_RECOGNITION' : 'FINGERPRINT');
      }
    }
    loadData();
  }, [router]);

  const handleSwitchAccount = async () => {
    await clearBiometricCredentials();
    router.replace('/(auth)/login');
  };

  const openBiometricModal = () => {
    bottomSheetRef.current?.present();
  };

  const handleNativeAuthentication = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: authType === 'FACIAL_RECOGNITION' ? 'Sign in with Face ID' : 'Sign in with Touch ID',
        fallbackLabel: 'Use password instead',
      });

      if (result.success) {
        bottomSheetRef.current?.dismiss();
        setIsLoggingIn(true);

        const credentials = await getBiometricCredentials();
        if (credentials) {
          await login(credentials.email, credentials.password);
          // Router replacement to (tabs) is handled automatically by auth guard if needed
          // or we can explicitly route if the app uses a root layout guard.
          // The root layout already guards based on token, so setting state in context should work.
        } else {
          Alert.alert('Error', 'Credentials not found. Please log in with password.');
          handleSwitchAccount();
        }
      } else if (result.error === 'user_fallback') {
        bottomSheetRef.current?.dismiss();
        handleSwitchAccount();
      }
    } catch (e: any) {
      console.error('Biometric Auth Error:', e);
      setIsLoggingIn(false);
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2: e?.message || 'Invalid credentials or session expired. Please log in again.',
      });
      // Clear invalid credentials and prompt manual login
      await clearBiometricCredentials();
      setTimeout(() => {
        handleSwitchAccount();
      }, 1500);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#181818" />
      </View>
    );
  }

  const isFaceId = authType === 'FACIAL_RECOGNITION';
  const buttonText = `Sign in with ${isFaceId ? 'Face ID' : 'Touch ID'}`;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back,</Text>
        <Text style={styles.title}>{user.firstName || 'User'}</Text>
      </View>

      <View style={styles.card}>
        <Pressable
          style={styles.userRow}
          onPress={() => {
            router.replace({ pathname: '/(auth)/login', params: { email: user.email } });
          }}
        >
          <View style={styles.avatarContainer}>
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.firstName?.charAt(0) || 'U'}</Text>
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>

          <ChevronRight size={20} color="#0f172a" />
        </Pressable>
      </View>

      <View style={styles.switchAccountRow}>
        <Text style={styles.switchAccountText}>Not you? </Text>
        <Pressable onPress={handleSwitchAccount}>
          <Text style={styles.switchAccountLink}>Sign in with a different account</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed]}
        onPress={openBiometricModal}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.biometricButtonText}>{buttonText}</Text>
        )}
      </Pressable>

      <BiometricModal
        ref={bottomSheetRef}
        authType={authType}
        onUsePassword={() => {
          bottomSheetRef.current?.dismiss();
          handleSwitchAccount();
        }}
        onAuthenticate={handleNativeAuthentication}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 34,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  switchAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchAccountText: {
    fontSize: 14,
    color: '#475569',
  },
  switchAccountLink: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  biometricButton: {
    backgroundColor: '#181818',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
