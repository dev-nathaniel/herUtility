import { AuthInput, BrandHeader } from '@/components/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CheckSquare, Lock, Mail, Square, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match",
      });
      return;
    }

    if (!form.acceptTerms) {
      Toast.show({
        type: "error",
        text1: "Terms Required",
        text2: "Please accept the terms and conditions",
      });
      return;
    }
    setIsLoading(true);
    try {
      await register(form.firstName, form.lastName, form.email.trim().toLowerCase(), form.password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error?.message || 'Could not create account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateLogin = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.decorativeContainer}>
        <LinearGradient
          colors={['rgba(251, 207, 232, 0.3)', 'rgba(251, 207, 232, 0)']}
          style={[styles.decorativeCircle, styles.topCircle]}
        />
        <LinearGradient
          colors={['rgba(221, 214, 254, 0.3)', 'rgba(221, 214, 254, 0)']}
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Start monitoring your utilities today.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                icon={User}
                placeholder="First Name"
                value={form.firstName}
                onChangeText={(text) => setForm({ ...form, firstName: text })}
                autoComplete="name-given"
                textContentType="givenName"
              />
              <AuthInput
                icon={User}
                placeholder="Last Name"
                value={form.lastName}
                onChangeText={(text) => setForm({ ...form, lastName: text })}
                autoComplete="name-family"
                textContentType="familyName"
              />
              {/* <AuthInput
                icon={Building}
                placeholder="Company Name"
                value={company}
                onChangeText={setCompany}
              /> */}
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                autoComplete="email"
                textContentType="emailAddress"
              />
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="Password"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                autoComplete="password-new"
                textContentType="newPassword"
              />

              <Pressable
                style={styles.termsContainer}
                onPress={() => setForm({ ...form, acceptTerms: !form.acceptTerms })}
              >
                <View style={[styles.checkbox, form.acceptTerms && styles.checkboxChecked]}>
                  {form.acceptTerms ? (
                    <CheckSquare size={18} color="#fff" />
                  ) : (
                    <Square size={18} color="#94a3b8" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.createAccountButton,
                  pressed && styles.createAccountButtonPressed,
                  isLoading && styles.createAccountButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isLoading ? ['#94a3b8', '#94a3b8'] : ['#7c3aed', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createAccountButtonText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already a member?{' '}
              </Text>
              <Pressable onPress={handleNavigateLogin}>
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </View>
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
    top: '-25%',
    right: '-20%',
    width: '110%',
    height: '55%',
  },
  bottomCircle: {
    bottom: '-15%',
    left: '-20%',
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
    marginBottom: 24,
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
  createAccountButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#a5b4fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  createAccountButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  createAccountButtonDisabled: {
    shadowOpacity: 0,
  },
  gradientButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f46e5',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    marginRight: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});
