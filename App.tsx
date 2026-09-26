import React, {
  useEffect,
  useRef,
} from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { GymProvider } from './src/contexts/GymContext';
import { SyncProvider } from './src/contexts/SyncContext';
import { SyncStatusBanner } from './src/components/SyncStatusBanner';
import { ProductionErrorBoundary } from './src/components/ProductionErrorBoundary';
import { initializeTelemetry } from './src/services/telemetry';
import { logger } from './src/services/logger';

initializeTelemetry();

export default function App() {
  const notificationListener =
    useRef<
      Notifications.Subscription | null
    >(null);

  const responseListener =
    useRef<
      Notifications.Subscription | null
    >(null);

  useEffect(() => {
    notificationService
      .initialize({
        enableRemotePush: false,
        subscribeSupabase: true,
      })
      .catch(error =>
        logger.error(
          'Notification service initialization failed',
          error
        )
      );

    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (
          nextAppState:
            AppStateStatus
        ) => {
          if (
            nextAppState ===
            'active'
          ) {
            notificationService
              .checkMembershipExpirations()
              .catch(error =>
                logger.error(
                  'Membership expiry check failed',
                  error
                )
              );
          }
        }
      );

    notificationListener.current =
      Notifications
        .addNotificationReceivedListener(
          notification => {
            logger.debug(
              'Notification received',
              {
                identifier:
                  notification
                    .request
                    .identifier,
              }
            );
          }
        );

    responseListener.current =
      Notifications
        .addNotificationResponseReceivedListener(
          response => {
            const data =
              response.notification
                .request.content.data;

            logger.debug(
              'Notification opened',
              {
                type:
                  data?.type,
                hasClientId:
                  Boolean(
                    data?.clientId
                  ),
              }
            );
          }
        );

    return () => {
      appStateSubscription.remove();

      notificationListener.current
        ?.remove();

      responseListener.current
        ?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
    >
      <SafeAreaProvider>
        <ProductionErrorBoundary>
          <AuthProvider>
            <GymProvider>
              <SyncProvider>
                <StatusBar
                  style="auto"
                />
                <AppNavigator />
                <SyncStatusBanner />
              </SyncProvider>
            </GymProvider>
          </AuthProvider>
        </ProductionErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}