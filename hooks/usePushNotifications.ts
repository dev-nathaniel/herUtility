import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/auth/auth-context';
import { registerForPushNotificationsAsync } from '../lib/notifications';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('expo-notifications failed to initialize:', e);
}

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<any>(undefined);
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!Notifications) {
      console.warn('Skipping push notification registration: expo-notifications is not available');
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Register token with backend when user is authenticated and token is available
  useEffect(() => {
    if (isAuthenticated && user && expoPushToken) {
      console.log('Registering push token with backend:', expoPushToken);
      apiClient.registerPushToken(expoPushToken).catch(err => {
        console.error('Failed to register push token:', err);
      });
    }
  }, [isAuthenticated, user, expoPushToken]);

  return {
    expoPushToken,
    notification,
  };
};
