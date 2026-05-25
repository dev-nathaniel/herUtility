import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications failed to load in notifications.ts:', e);
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    console.warn('registerForPushNotificationsAsync: expo-notifications is not available');
    return;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // Project ID is usually in app.json/app.config.js
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found in expo config. Push notifications might not work in production.');
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.error('Error getting expo push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export function handleRegistrationError(errorMessage: string) {
  Toast.show({
    type: "error",
    text1: "Registration Error",
    text2: errorMessage,
  });
  throw new Error(errorMessage);
}
