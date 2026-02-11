import { AuthInput, BrandHeader } from '@/components/auth';
import { useResetPassword } from '@/hooks/api/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function NewPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const resetPassword = useResetPassword();

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    try {
      await resetPassword.mutateAsync({ email, newPassword });
      router.replace('/(auth)/password-success');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reset password');
    }
  };

  const handleBackToLogin = () => {
    router.dismissAll();
    router.replace('/(auth)/login');
  };

  const isFormValid = newPassword.length >= 6 && confirmPassword.length >= 6;

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.decorativeContainer}>
        <LinearGradient
          colors={['rgba(196, 181, 253, 0.3)', 'rgba(196, 181, 253, 0)']}
          style={[styles.decorativeCircle, styles.topCircle]}
        />
        <LinearGradient
          colors={['rgba(165, 180, 252, 0.3)', 'rgba(165, 180, 252, 0)']}
          style={[styles.decorativeCircle, styles.bottomCircle]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <BrandHeader />

            <View style={styles.headerText}>
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Create a new secure password.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError('');
                }}
              />
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
              />

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.updateButton,
                  pressed && styles.updateButtonPressed,
                  (!isFormValid || resetPassword.isPending) && styles.updateButtonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={!isFormValid || resetPassword.isPending}
              >
                {resetPassword.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateButtonText}>Update Password</Text>
                )}
              </Pressable>
            </View>

            <Pressable style={styles.backButton} onPress={handleBackToLogin}>
              <ArrowLeft size={16} color="#4f46e5" />
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  topCircle: {
    top: '-20%',
    left: '-20%',
    width: '100%',
    height: '50%',
  },
  bottomCircle: {
    bottom: '-20%',
    right: '-20%',
    width: '100%',
    height: '50%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerText: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#cbd5e1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 8,
  },
  updateButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#000',
  },
  updateButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f46e5',
  },
});
