// Note: Android Push notifications (remote notifications) functionality provided by expo-notifications
// was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go.
// Read more at: https://docs.expo.dev/develop/development-builds/introduction/
// For full push notification support on Android, build with EAS Build or use a development build.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Payment, Client } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  // Request permissions
  registerForPushNotifications: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  },

  // Schedule payment reminder
  schedulePaymentReminder: async (client: Client, dueDate: string, daysBefore: number = 3): Promise<string> => {
    const dueDateObj = new Date(dueDate);
    const reminderDate = new Date(dueDateObj);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);

    // Don't schedule if reminder date is in the past
    if (reminderDate < new Date()) {
      console.log('Reminder date is in the past, skipping...');
      return '';
    }

    const seconds = Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000));
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Payment Reminder 💰',
        body: `Reminder: ${client.name}'s payment is due in ${daysBefore} days (${dueDate})`,
        data: { 
          clientId: client.id,
          type: 'payment_reminder',
          dueDate 
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { seconds } as any,
    });

    console.log(`Scheduled payment reminder for ${client.name} on ${reminderDate}`);
    return identifier;
  },

  // Schedule membership expiry reminder
  scheduleMembershipExpiry: async (client: Client, dueDate: string): Promise<string> => {
    const dueDateObj = new Date(dueDate);
    
    // Schedule for the due date at 9 AM
    dueDateObj.setHours(9, 0, 0, 0);

    const seconds = Math.max(1, Math.floor((dueDateObj.getTime() - Date.now()) / 1000));
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Membership Expired 📅',
        body: `${client.name}'s membership has expired today. Please follow up for payment.`,
        data: { 
          clientId: client.id,
          type: 'membership_expired',
          dueDate 
        },
        sound: true,
      },
      trigger: { seconds } as any,
    });

    return identifier;
  },

  // Cancel specific notification
  cancelScheduledNotification: async (identifier: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },

  // Cancel all notifications for a client
  cancelAllClientNotifications: async (clientId: string): Promise<void> => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.clientId === clientId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  },

  // Get all scheduled notifications
  getScheduledNotifications: async (): Promise<Notifications.NotificationRequest[]> => {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  // Clear all notifications
  clearAllNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};