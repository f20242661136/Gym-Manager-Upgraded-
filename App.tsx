import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { GymProvider } from './src/contexts/GymContext';

export default function App() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Initialize notification service with Supabase realtime subscription and without remote push
    notificationService.initialize({ enableRemotePush: false, subscribeSupabase: true }).catch(e => console.error(e));

    // Listen for app state changes to check membership expirations when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App has come to the foreground, check for expired memberships
        notificationService.checkMembershipExpirations().catch(e => console.error('Error checking membership expirations on app resume:', e));
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap - you could navigate to specific screens
      const data = response.notification.request.content.data;

      if (data.type === 'payment_reminder' && data.clientId) {
        // Navigate to client detail screen
        // You'd need to use navigation ref here
      }

      if (data.type === 'membership_expired' && data.clientId) {
        // Navigate to client detail screen for renewal
        console.log('Membership expired for client:', data.clientId);
      }

      if (data.type === 'membership_expiring' && data.clientId) {
        // Navigate to client detail screen for renewal
        console.log('Membership expiring soon for client:', data.clientId);
      }
    });

    return () => {
      if (appStateSubscription && typeof appStateSubscription.remove === 'function') {
        appStateSubscription.remove();
      }
      if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
        notificationListener.current.remove();
      }
      if (responseListener.current && typeof responseListener.current.remove === 'function') {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GymProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </GymProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
