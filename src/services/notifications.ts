// Note: Android Push notifications (remote notifications) functionality provided by expo-notifications
// was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go.
// Read more at: https://docs.expo.dev/develop/development-builds/introduction/
// For full push notification support on Android, build with EAS Build or use a development build.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { Client } from '../types/index';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  // create and log Android notification channel
  async ensureAndroidChannel() {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      // log channel properties (if available)
      try {
        // @ts-ignore - expo-notifications may not expose this in all versions
        const ch = await Notifications.getNotificationChannelAsync('default');
        console.log('Android notification channel:', ch);
      } catch (e) {
        console.log('Could not get channel info', e);
      }
    } catch (err) {
      console.error('Error creating notification channel', err);
    }
  },
  // If you don't want to use remote push (FCM) you can leave enableRemote=false and
  // the app will rely on Supabase realtime events to show local notifications.
  async registerForPushNotifications(enableRemote = false) {
    if (!enableRemote) {
      // Not registering for remote push. Ensure Android channel exists for local notifications.
      await this.ensureAndroidChannel();
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    console.log('Expo push token:', token.data);

    if (Platform.OS === 'android') {
      await this.ensureAndroidChannel();
    }

    return token.data;
  },

  async schedulePaymentReminder(clientId: string, clientName: string, dueDate: Date) {
    const seconds = Math.max(1, Math.floor((dueDate.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Payment Reminder',
        body: `Payment due for ${clientName}`,
        sound: 'default',
        data: { type: 'payment_reminder', clientId },
      },
      // use seconds trigger to be compatible with Expo's NotificationTriggerInput
      trigger: { seconds } as any,
    });
  },

  async checkMembershipExpirations() {
    try {
      const clients = await api.getClients();
      const now = new Date();
      const expiredClients: Client[] = [];

      for (const client of clients) {
        if (client.membershipDueDate && new Date(client.membershipDueDate) < now && client.membershipStatus === 'Paid') {
          expiredClients.push(client);

          // Update client status to Unpaid
          try {
            await api.updateClient(client.id, {
              ...client,
              membershipStatus: 'Unpaid'
            }, true);
          } catch (updateError) {
            console.error('Error updating client status:', updateError);
          }
        }
      }

      // Send notifications for newly expired memberships
      for (const client of expiredClients) {
        await this.sendMembershipExpiredNotification(client);
      }

      return expiredClients;
    } catch (error) {
      console.error('Error checking membership expirations:', error);
      return [];
    }
  },

  async sendMembershipExpiredNotification(client: Client) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Membership Expired',
        body: `${client.name}'s membership has expired. Please renew their membership.`,
        sound: 'default',
        data: { type: 'membership_expired', clientId: client.id },
      },
      trigger: null, // Immediate notification
    });
  },

  async scheduleMembershipExpiryReminders() {
    try {
      const clients = await api.getClients();
      const now = new Date();

      for (const client of clients) {
        if (client.membershipDueDate) {
          const dueDate = new Date(client.membershipDueDate);

          // Schedule reminder 3 days before expiry
          const reminderDate = new Date(dueDate);
          reminderDate.setDate(reminderDate.getDate() - 3);

          if (reminderDate > now) {
            const seconds = Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000));
            await Notifications.scheduleNotificationAsync({
                content: {
                title: 'Membership Expiring Soon',
                body: `${client.name}'s membership expires in 3 days. Consider renewing.`,
                sound: 'default',
                  data: { type: 'membership_expiring', clientId: client.id },
                },
              trigger: { seconds } as any,
            });
          }

          // Schedule reminder 1 day before expiry
          const urgentReminderDate = new Date(dueDate);
          urgentReminderDate.setDate(urgentReminderDate.getDate() - 1);

          if (urgentReminderDate > now) {
            const seconds = Math.max(1, Math.floor((urgentReminderDate.getTime() - Date.now()) / 1000));
            await Notifications.scheduleNotificationAsync({
                content: {
                title: 'Membership Expires Tomorrow',
                body: `${client.name}'s membership expires tomorrow. Please renew.`,
                sound: 'default',
                  data: { type: 'membership_expiring_urgent', clientId: client.id },
                },
              trigger: { seconds } as any,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling membership expiry reminders:', error);
    }
  },

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Subscribe to Supabase realtime events and show local notifications when events occur
  async subscribeToSupabaseEvents() {
    try {
      // Example: listen to new payments inserted into `payments` table
      const paymentsChannel = supabase.channel('public:payments')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
          const payment = payload.new as any;
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Payment Recorded',
              body: `Payment of Rs. ${payment.amount} recorded for ${payment.clientName}`,
              sound: 'default',
              data: { type: 'payment_recorded', paymentId: payment.id },
            },
            trigger: null,
          }).catch((e: any) => console.error('Present notification error', e));
        })
        .subscribe();

      // Example: listen to client membership updates (expiry)
      const clientsChannel = supabase.channel('public:clients')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
          const client = payload.new as any;
          if (payload.eventType === 'UPDATE' && client.membershipDueDate) {
            // You can decide what to notify on update
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Client Updated',
                body: `${client.name} was updated`,
                  sound: 'default',
                data: { type: 'client_updated', clientId: client.id },
              },
              trigger: null,
            }).catch((e: any) => console.error('Present notification error', e));
          }
        })
        .subscribe();

      return { paymentsChannel, clientsChannel };
    } catch (error) {
      console.error('Error subscribing to Supabase events', error);
      return null;
    }
  },

  // Re-schedule all membership expiry reminders (call this after payment updates)
  async rescheduleMembershipReminders() {
    // Cancel existing membership-related notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      const type = notification.content.data?.type;
      if (typeof type === 'string' && type.includes('membership')) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    // Re-schedule all reminders
    await this.scheduleMembershipExpiryReminders();
  },

  // Initialize notification system and set up periodic checks
  async initialize(opts: { enableRemotePush?: boolean; subscribeSupabase?: boolean } = {}) {
    const { enableRemotePush = false, subscribeSupabase = true } = opts;

    // Ensure Android channel exists as early as possible so scheduled notifications use it
    await this.ensureAndroidChannel();

    // Register for push notifications (remote only if enabled)
    await this.registerForPushNotifications(enableRemotePush);

    // Schedule expiry reminders for existing clients
    await this.scheduleMembershipExpiryReminders();

    // Check for expired memberships immediately
    await this.checkMembershipExpirations();

    // Optionally subscribe to Supabase realtime events to show in-app notifications
    if (subscribeSupabase) {
      this.subscribeToSupabaseEvents().catch(e => console.error(e));
    }

    // Set up periodic checks (every 24 hours)
    setInterval(async () => {
      await this.checkMembershipExpirations();
      await this.scheduleMembershipExpiryReminders();
    }, 24 * 60 * 60 * 1000); // 24 hours
  },

  // Production: debug helpers removed
};
