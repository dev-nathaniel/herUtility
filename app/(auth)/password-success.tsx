import { BrandHeader } from '@/components/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function PasswordSuccessScreen() {
  const router = useRouter();

  const handleBackToSignIn = () => {
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

      <View style={styles.content}>
        <BrandHeader />

        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <CheckCircle size={40} color="#16a34a" />
          </View>
          
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been successfully updated. You can now log in.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
            ]}
            onPress={handleBackToSignIn}
          >
            <Text style={styles.signInButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  signInButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#4338ca',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
