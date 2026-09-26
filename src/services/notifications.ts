// Note: Android Push notifications (remote notifications) functionality provided by expo-notifications
// was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go.
// Read more at: https://docs.expo.dev/develop/development-builds/introduction/
// For full push notification support on Android, build with EAS Build or use a development build.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { Client } from '../types/index';
import { supabase } from './supabase';
import { storage } from './storage';
import { getCurrentGymId } from './gymService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    sound: 'default',
  }),
});

export const notificationService = {
  // Check if notifications are enabled in settings
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const storedValue = await storage.getItem('notificationsEnabled');
      return storedValue !== 'false'; // Default to true if not set
    } catch (error) {
      console.error('Error checking notification setting:', error);
      return true; // Default to enabled on error
    }
  },

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

  async schedulePaymentReminder(
    clientId: string,
    clientName: string,
    dueDate: Date
  ) {
    if (
      !(
        await this
          .areNotificationsEnabled()
      )
    ) {
      return;
    }

    const target =
      new Date(dueDate);

    if (
      Number.isNaN(
        target.getTime()
      ) ||
      target.getTime() <=
        Date.now()
    ) {
      return;
    }

    await Notifications
      .scheduleNotificationAsync({
        content: {
          title:
            'Payment reminder',
          body:
            `Payment due for ${clientName}`,
          sound: 'default',
          data: {
            type:
              'payment_reminder',
            clientId,
          },
        },
        trigger: {
          type:
            Notifications
              .SchedulableTriggerInputTypes
              .DATE,
          date: target,
          channelId:
            Platform.OS ===
            'android'
              ? 'default'
              : undefined,
        },
      });
  },

  async schedulePaymentNotification(
    clientId: string,
    clientName: string,
    duration: number
  ) {
    if (
      !(
        await this
          .areNotificationsEnabled()
      )
    ) {
      return;
    }

    const safeDuration =
      Math.max(
        1,
        Math.round(duration)
      );

    const now =
      new Date();

    const expiryDate =
      new Date(now);

    expiryDate.setDate(
      expiryDate.getDate() +
        safeDuration
    );

    // Membership notifications should be tied to a local calendar
    // date rather than the exact second a fee was received.
    expiryDate.setHours(
      9,
      0,
      0,
      0
    );

    const notifyBeforeDays =
      safeDuration < 3
        ? 1
        : 3;

    const warningDate =
      new Date(
        expiryDate
      );

    warningDate.setDate(
      warningDate.getDate() -
        notifyBeforeDays
    );

    if (
      warningDate.getTime() >
      now.getTime()
    ) {
      await Notifications
        .scheduleNotificationAsync({
          content: {
            title:
              'Renewal coming up',
            body:
              `${clientName}'s membership expires in ${notifyBeforeDays} day${notifyBeforeDays === 1 ? '' : 's'}.`,
            sound: 'default',
            data: {
              type:
                'membership_expiry_warning',
              clientId,
            },
          },
          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .DATE,
            date:
              warningDate,
            channelId:
              Platform.OS ===
              'android'
                ? 'default'
                : undefined,
          },
        });
    }

    if (
      expiryDate.getTime() >
      now.getTime()
    ) {
      await Notifications
        .scheduleNotificationAsync({
          content: {
            title:
              'Membership expired',
            body:
              `${clientName}'s membership expires today. Review renewal at the front desk.`,
            sound: 'default',
            data: {
              type:
                'membership_expired',
              clientId,
            },
          },
          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .DATE,
            date:
              expiryDate,
            channelId:
              Platform.OS ===
              'android'
                ? 'default'
                : undefined,
          },
        });
    }
  },

  async checkMembershipExpirations() {
    try {
      // STAB_THEME_GYM_GUARD
      if (!(await getCurrentGymId())) {
        return [];
      }
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
    if (!(await this.areNotificationsEnabled())) return;

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
      if (!(await getCurrentGymId())) {
        return;
      }
      if (
        !(
          await this
            .areNotificationsEnabled()
        )
      ) {
        return;
      }

      // Rebuild these reminders from current member data every time.
      // This prevents duplicate reminders accumulating across launches.
      const existing =
        await Notifications
          .getAllScheduledNotificationsAsync();

      const rebuiltTypes =
        new Set([
          'membership_expiring',
          'membership_expiring_urgent',
          'daily_expired_memberships',
        ]);

      for (
        const notification
        of existing
      ) {
        const type =
          notification
            .content
            .data
            ?.type;

        if (
          typeof type ===
            'string' &&
          rebuiltTypes.has(
            type
          )
        ) {
          await Notifications
            .cancelScheduledNotificationAsync(
              notification.identifier
            );
        }
      }

      const clients =
        await api.getClients();

      const now =
        new Date();

      for (
        const client
        of clients
      ) {
        if (
          !client
            .membershipDueDate
        ) {
          continue;
        }

        const dueDate =
          new Date(
            client
              .membershipDueDate
          );

        if (
          Number.isNaN(
            dueDate.getTime()
          )
        ) {
          continue;
        }

        // Keep reminders on a predictable local front-desk hour.
        dueDate.setHours(
          9,
          0,
          0,
          0
        );

        const threeDay =
          new Date(
            dueDate
          );

        threeDay.setDate(
          threeDay.getDate() -
            3
        );

        if (
          threeDay.getTime() >
          now.getTime()
        ) {
          await Notifications
            .scheduleNotificationAsync({
              content: {
                title:
                  'Renewal coming up',
                body:
                  `${client.name}'s membership expires in 3 days.`,
                sound:
                  'default',
                data: {
                  type:
                    'membership_expiring',
                  clientId:
                    client.id,
                },
              },
              trigger: {
                type:
                  Notifications
                    .SchedulableTriggerInputTypes
                    .DATE,
                date:
                  threeDay,
                channelId:
                  Platform.OS ===
                  'android'
                    ? 'default'
                    : undefined,
              },
            });
        }

        const oneDay =
          new Date(
            dueDate
          );

        oneDay.setDate(
          oneDay.getDate() -
            1
        );

        if (
          oneDay.getTime() >
          now.getTime()
        ) {
          await Notifications
            .scheduleNotificationAsync({
              content: {
                title:
                  'Membership expires tomorrow',
                body:
                  `${client.name}'s membership expires tomorrow.`,
                sound:
                  'default',
                data: {
                  type:
                    'membership_expiring_urgent',
                  clientId:
                    client.id,
                },
              },
              trigger: {
                type:
                  Notifications
                    .SchedulableTriggerInputTypes
                    .DATE,
                date:
                  oneDay,
                channelId:
                  Platform.OS ===
                  'android'
                    ? 'default'
                    : undefined,
              },
            });
        }
      }

      await this
        .scheduleDailyExpiredMembershipReminders();
    } catch (error) {
      console.error(
        'Error scheduling membership expiry reminders:',
        error
      );
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, async (payload) => {
          if (!(await this.areNotificationsEnabled())) return;

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async (payload) => {
          if (!(await this.areNotificationsEnabled())) return;

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

  // Schedule daily reminders for expired memberships (when app is closed)
  async scheduleDailyExpiredMembershipReminders() {
    try {
      if (!(await getCurrentGymId())) {
        return;
      }
      if (
        !(
          await this
            .areNotificationsEnabled()
        )
      ) {
        return;
      }

      const scheduled =
        await Notifications
          .getAllScheduledNotificationsAsync();

      for (
        const notification
        of scheduled
      ) {
        const type =
          notification
            .content
            .data
            ?.type;

        if (
          type ===
          'daily_expired_memberships'
        ) {
          await Notifications
            .cancelScheduledNotificationAsync(
              notification.identifier
            );
        }
      }

      const clients =
        await api.getClients();

      const now =
        new Date();

      const expiredCount =
        clients.filter(
          client => {
            if (
              !client
                .membershipDueDate
            ) {
              return false;
            }

            const due =
              new Date(
                client
                  .membershipDueDate
              );

            return (
              !Number.isNaN(
                due.getTime()
              ) &&
              due.getTime() <
                now.getTime() &&
              client
                .membershipStatus ===
                'Unpaid'
            );
          }
        ).length;

      if (
        expiredCount === 0
      ) {
        return;
      }

      await Notifications
        .scheduleNotificationAsync({
          content: {
            title:
              'Expired memberships',
            body:
              `${expiredCount} member${expiredCount === 1 ? '' : 's'} need renewal.`,
            sound: 'default',
            data: {
              type:
                'daily_expired_memberships',
              count:
                expiredCount,
            },
          },
          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .DAILY,
            hour: 9,
            minute: 0,
            channelId:
              Platform.OS ===
              'android'
                ? 'default'
                : undefined,
          },
        });
    } catch (error) {
      console.error(
        'Error scheduling daily expired membership reminders:',
        error
      );
    }
  },

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

    if (enableRemotePush) {
      await this.registerForPushNotifications(true);
    } else {
      await this.ensureAndroidChannel();
    }

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


