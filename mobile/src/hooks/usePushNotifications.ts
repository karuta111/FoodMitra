// mobile/src/hooks/usePushNotifications.ts
// Registers the device for Expo push notifications + sends the token to the backend.
// Also handles incoming notifications (foreground banner + tap-to-navigate to order tracking).

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

// Configure how notifications are shown when the app is in the foreground (open).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(navigationRef: any) {
  const { user } = useAuthStore();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Only register if the user is logged in
    if (!user) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        // Send token to backend
        api.post('/customers/push-token', { token }).catch(() => {});
        console.log('[push] Token registered:', token.slice(0, 30) + '...');
      }
    });

    // Listen for incoming notifications while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[push] Received:', notification.request.content.title);
    });

    // Listen for when the user TAPS a notification (app was backgrounded/closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[push] Tapped, data:', data);
      // Navigate to order tracking if the notification has an orderId/screen
      if (data?.screen === 'OrderTracking' && data?.orderId && navigationRef.current) {
        navigationRef.current.navigate('OrderTracking', { orderId: data.orderId });
      }
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [user?.id]); // re-register when the user changes (login/logout)
}

async function registerForPushNotifications(): Promise<string | null> {
  // Must be a physical device (not simulator/emulator)
  if (!Device.isDevice) {
    console.log('[push] Must use a physical device for push notifications');
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  // Get the Expo push token
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'foodmitra', // your Expo project ID
  })).data;
  return token;
}
