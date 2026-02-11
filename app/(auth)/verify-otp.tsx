import { BrandHeader } from '@/components/auth';
import { useForgotPassword, useVerifyOtp } from '@/hooks/api/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const verifyOtp = useVerifyOtp();
  const resendOtp = useForgotPassword();

  const handleOtpChange = (index: number, value: string) => {
    // Only accept digits - filter out any non-numeric characters
    const digit = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    try {
      await verifyOtp.mutateAsync({ email, otp: code });
      router.replace({
        pathname: '/(auth)/new-password',
        params: { email },
      });
    } catch (error: any) {
      Alert.alert('Verification Failed', error?.message || 'Invalid or expired code');
    }
  };

  const handleResendCode = async () => {
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    try {
      await resendOtp.mutateAsync({ email });
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to resend code');
    }
  };

  const handleBackToLogin = () => {
    router.dismissAll();
    router.replace('/(auth)/login');
  };

  const isOtpComplete = otp.join('').length === 6;

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
              <Text style={styles.title}>Verification</Text>
            <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={index === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

              <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.verifyButtonPressed,
                (!isOtpComplete || verifyOtp.isPending) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={!isOtpComplete || verifyOtp.isPending}
            >
              {verifyOtp.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={resendOtp.isPending}
            >
              <Text style={styles.resendButtonText}>
                {resendOtp.isPending ? 'Sending...' : 'Resend Code'}
              </Text>
            </Pressable>

            <View style={styles.divider} />

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
    lineHeight: 24,
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#1e293b',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  verifyButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#cbd5e1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  verifyButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#000',
  },
  verifyButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 24,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 24,
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
