import { AuthInput } from '@/components/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'expo-router';
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
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AntDesign } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const { register, googleLogin } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const hasConfig = !!clientId;

    if (hasConfig) {
      setIsLoading(true);
      try {
        const redirectUri = Linking.createURL('/(auth)/signup');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=id_token` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&nonce=random_nonce`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const params = parsed.queryParams || {};
          const idToken = params.id_token;
          if (idToken) {
            await googleLogin("", "", "", String(idToken));
            Toast.show({
              type: 'success',
              text1: 'Authenticated',
              text2: 'Logged in successfully with Google',
            });
            router.replace('/(tabs)');
          } else {
            throw new Error("No ID Token returned from Google");
          }
        }
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: 'Google Login Error',
          text2: e.message || 'Failed to authenticate with Google'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert(
        "Google Sign-In (Dev Sandbox)",
        "Configure Google client IDs in your .env to use real OAuth. Choose an account to simulate login:",
        [
          {
            text: "Sarah Jenkins (sarah.j@google.com)",
            onPress: () => performMockLogin("sarah.j@google.com", "Sarah", "Jenkins")
          },
          {
            text: "Jane Doe (jane.doe@gmail.com)",
            onPress: () => performMockLogin("jane.doe@gmail.com", "Jane", "Doe")
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const performMockLogin = async (email: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      await googleLogin(email, firstName, lastName);
      Toast.show({
        type: 'success',
        text1: 'Authenticated',
        text2: 'Logged in successfully with Google sandbox',
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Google Login Error", error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!form.name || !form.email || !form.password) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all fields",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address",
      });
      return;
    }

    setIsLoading(true);
    try {
      const nameParts = form.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      await register(firstName, lastName, form.email.trim().toLowerCase(), form.password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error?.message || 'Could not create account',
      });
      console.log('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateLogin = () => {
    router.back();
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
              <Text style={styles.title}>Let’s get you{'\n'}signed up</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.cardContainer}>
            <AuthInput
              label="Name"
              placeholder="John Doe"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              autoComplete="name"
              textContentType="name"
            />
            <AuthInput
              label="Email"
              type="email"
              placeholder="johndoe@gmail.com"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoComplete="email"
              textContentType="emailAddress"
            />
            <AuthInput
              label="Password"
              type="password"
              placeholder="***************"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              autoComplete="password-new"
              textContentType="newPassword"
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
              </Text>
              <Pressable onPress={handleNavigateLogin}>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.createAccountButton,
              pressed && styles.createAccountButtonPressed,
              isLoading && styles.createAccountButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createAccountButtonText}>Create account</Text>
            )}
          </Pressable>

          {/* Divider */}
          {/* <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View> */}

          {/* Google Sign In Button */}
          {/* <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              isLoading && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <AntDesign name="google" size={20} color="#0f172a" style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable> */}
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
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 32,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
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
  createAccountButton: {
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
  createAccountButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#000000',
  },
  createAccountButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#f8fafc',
  },
  googleButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    shadowOpacity: 0,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  googleIcon: {
    marginRight: 10,
  },
});
