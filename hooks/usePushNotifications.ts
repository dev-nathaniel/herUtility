import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/auth/auth-context';
import { registerForPushNotificationsAsync } from '../lib/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
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
