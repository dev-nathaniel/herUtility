import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { getLastLoggedInUser } from '../../lib/auth/biometric-storage';

export default function AuthIndex() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingAndBiometric = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        
        if (hasSeenOnboarding === 'true') {
          // Check if there is a last logged in user for quick login
          const lastUser = await getLastLoggedInUser();
          if (lastUser) {
            router.replace('/(auth)/quick-login');
          } else {
            router.replace('/(auth)/login');
          }
        } else {
          router.replace('/(auth)/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding/biometric state:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingAndBiometric();
  }, [router]);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#181818" />
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}
