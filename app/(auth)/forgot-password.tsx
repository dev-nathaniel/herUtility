import { AuthInput, BrandHeader } from '@/components/auth';
import { useForgotPassword } from '@/hooks/api/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const forgotPassword = useForgotPassword();

  const handleSendCode = async () => {
    if (!email) return;
    try {
      await forgotPassword.mutateAsync({ email: email.trim().toLowerCase() });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send verification code');
    }
  };

  const handleBackToLogin = () => {
    router.dismissAll();
    router.replace('/(auth)/login');
  };

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
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email to receive a verification code.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.sendCodeButton,
                  pressed && styles.sendCodeButtonPressed,
                  (!email || forgotPassword.isPending) && styles.sendCodeButtonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={!email || forgotPassword.isPending}
              >
                {forgotPassword.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendCodeButtonText}>Send Code</Text>
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
  sendCodeButton: {
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
  sendCodeButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#000',
  },
  sendCodeButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  sendCodeButtonText: {
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
