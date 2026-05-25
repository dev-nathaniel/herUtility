import { AuthInput } from '@/components/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState(params.email?.toString() || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email and password',
      });
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error?.message || 'Invalid email or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section with Title and Illustration */}
          <View style={styles.headerContainer}>
            <View style={styles.illustrationContainer}>
              <Image
                source={require('@/assets/images/plug_illustration.png')}
                style={styles.illustration}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome{'\n'}back</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.cardContainer}>
            <AuthInput
              label="Email"
              type="email"
              placeholder="johndoe@gmail.com"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              textContentType="emailAddress"
            />

            <View style={styles.passwordHeaderContainer}>
              <Text style={styles.label}>Password</Text>
              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPasswordText}>Forgot?</Text>
              </Pressable>
            </View>
            <AuthInput
              type="password"
              placeholder="***************"
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              textContentType="password"
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don’t have an account?{' '}
              </Text>
              <Pressable onPress={handleNavigateSignUp}>
                <Text style={styles.footerLink}>Sign up</Text>
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
              isLoading && styles.signInButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign in</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerContainer: {
    position: 'relative',
    paddingHorizontal: 24,
    paddingTop: 20,
    minHeight: 220,
  },
  illustrationContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 180,
    height: 160,
    zIndex: 1,
  },
  illustration: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  titleContainer: {
    paddingTop: 110,
    paddingBottom: 20,
    zIndex: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  cardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  passwordHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  signInButton: {
    backgroundColor: '#181818',
    paddingVertical: 18,
    borderRadius: 30,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#000000',
  },
  signInButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
