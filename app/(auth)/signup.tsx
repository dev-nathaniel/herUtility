import { AuthInput, BrandHeader } from '@/components/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Building, Lock, Mail, User } from 'lucide-react-native';
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

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      await register(fullName, email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'Could not create account');
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
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
              />
              <AuthInput
                icon={Building}
                placeholder="Company Name"
                value={company}
                onChangeText={setCompany}
              />
              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
              />
              <AuthInput
                icon={Lock}
                type="password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
              />

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
});
