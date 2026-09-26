import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoNotifications from 'expo-notifications';

import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useGym } from './GymContext';
import {
  LiveDataEvent,
  useLiveData,
} from './LiveDataContext';

export type NotificationCenterItem = {
  id: string;
  sourceKey: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  data?: Record<string, any>;
};

type NotificationCenterContextValue = {
  items: NotificationCenterItem[];
  unreadCount: number;
  realtimeConnected: boolean;
  refreshing: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationCenterContext =
  createContext<
    NotificationCenterContextValue | null
  >(null);

const MAX_ITEMS = 120;

const normalizeItems = (
  items: NotificationCenterItem[]
) =>
  [...items]
    .sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    )
    .slice(0, MAX_ITEMS);

const eventSourceKey = (
  event: LiveDataEvent
) => {
  const row =
    event.newRow ||
    event.oldRow ||
    {};

  if (
    event.table === 'payments'
  ) {
    return `payment:${
      row.id ||
      event.receivedAt
    }`;
  }

  if (
    event.table === 'clients'
  ) {
    return `client:${
      event.eventType
    }:${
      row.id ||
      event.receivedAt
    }:${
      row.updated_at ||
      row.created_at ||
      event.receivedAt
    }`;
  }

  return `${
    event.table
  }:${
    event.eventType
  }:${
    row.id ||
    event.receivedAt
  }:${
    event.commitTimestamp ||
    event.receivedAt
  }`;
};

export const NotificationCenterProvider:
  React.FC<React.PropsWithChildren> = ({
    children,
  }) => {
    const { user } = useAuth();
    const {
      activeGymId,
    } = useGym();

    const {
      lastEvent,
      realtimeConnected,
      refreshNow,
    } = useLiveData();

    const [
      items,
      setItems,
    ] = useState<
      NotificationCenterItem[]
    >([]);

    const itemsRef =
      useRef<
        NotificationCenterItem[]
      >([]);

    const [
      refreshing,
      setRefreshing,
    ] = useState(false);

    const storageKey = useMemo(
      () =>
        user?.id &&
        activeGymId
          ? `@gym_notification_center:${user.id}:${activeGymId}`
          : null,
      [
        user?.id,
        activeGymId,
      ]
    );

    const persist =
      useCallback(
        async (
          next:
            NotificationCenterItem[]
        ) => {
          const normalized =
            normalizeItems(next);

          itemsRef.current =
            normalized;
          setItems(normalized);

          if (storageKey) {
            await AsyncStorage.setItem(
              storageKey,
              JSON.stringify(
                normalized
              )
            );
          }
        },
        [storageKey]
      );

    const upsert =
      useCallback(
        async (
          item:
            NotificationCenterItem
        ) => {
          const current =
            itemsRef.current;

          const existingIndex =
            current.findIndex(
              entry =>
                entry.sourceKey ===
                item.sourceKey
            );

          if (
            existingIndex >= 0
          ) {
            return;
          }

          await persist([
            item,
            ...current,
          ]);
        },
        [persist]
      );

    useEffect(() => {
      let cancelled = false;

      const load = async () => {
        if (!storageKey) {
          itemsRef.current = [];
          setItems([]);
          return;
        }

        try {
          const raw =
            await AsyncStorage.getItem(
              storageKey
            );

          if (cancelled) return;

          const parsed = raw
            ? JSON.parse(raw)
            : [];

          const valid =
            Array.isArray(parsed)
              ? parsed
              : [];

          itemsRef.current =
            normalizeItems(valid);
          setItems(
            itemsRef.current
          );
        } catch (error) {
          console.error(
            'Notification center load failed:',
            error
          );
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [storageKey]);

    const addFromLiveEvent =
      useCallback(
        async (
          event:
            LiveDataEvent
        ) => {
          const row =
            event.newRow ||
            event.oldRow ||
            {};

          if (
            event.table ===
              'payments' &&
            event.eventType ===
              'INSERT'
          ) {
            const amount =
              row.amount ??
              '0';

            const clientName =
              row.client_name ??
              row.clientName ??
              'member';

            await upsert({
              id:
                eventSourceKey(
                  event
                ),
              sourceKey:
                eventSourceKey(
                  event
                ),
              type:
                'payment_received',
              title:
                'Payment received',
              body:
                `Rs. ${amount} received for ${clientName}.`,
              createdAt:
                row.created_at ||
                row.payment_date ||
                new Date(
                  event.receivedAt
                ).toISOString(),
              readAt: null,
              data: {
                paymentId:
                  row.id,
                clientId:
                  row.client_id,
              },
            });

            return;
          }

          if (
            event.table ===
              'clients' &&
            event.eventType ===
              'INSERT'
          ) {
            await upsert({
              id:
                eventSourceKey(
                  event
                ),
              sourceKey:
                eventSourceKey(
                  event
                ),
              type:
                'member_added',
              title:
                'New member',
              body:
                `${
                  row.name ||
                  'A member'
                } was added.`,
              createdAt:
                row.created_at ||
                new Date(
                  event.receivedAt
                ).toISOString(),
              readAt: null,
              data: {
                clientId:
                  row.id,
              },
            });

            return;
          }

          if (
            event.table
              .toLowerCase()
              .includes(
                'attendance'
              ) &&
            event.eventType ===
              'INSERT'
          ) {
            const member =
              row.client_name ??
              row.member_name ??
              row.name ??
              'Member';

            await upsert({
              id:
                eventSourceKey(
                  event
                ),
              sourceKey:
                eventSourceKey(
                  event
                ),
              type:
                'attendance',
              title:
                'Attendance activity',
              body:
                `${member} checked in.`,
              createdAt:
                row.created_at ||
                row.check_in_at ||
                new Date(
                  event.receivedAt
                ).toISOString(),
              readAt: null,
              data: {
                clientId:
                  row.client_id ??
                  row.member_id,
              },
            });
          }
        },
        [upsert]
      );

    useEffect(() => {
      if (!lastEvent) return;

      addFromLiveEvent(
        lastEvent
      ).catch(error =>
        console.error(
          'Live notification failed:',
          error
        )
      );
    }, [
      lastEvent,
      addFromLiveEvent,
    ]);

    const syncMembershipAlerts =
      useCallback(async () => {
        if (
          !user ||
          !activeGymId
        ) {
          return;
        }

        try {
          const clients =
            await api.getClients();

          const now =
            Date.now();

          for (
            const client of clients
          ) {
            if (
              !client
                .membershipDueDate
            ) {
              continue;
            }

            const due =
              new Date(
                client.membershipDueDate
              );

            const dueMs =
              due.getTime();

            if (
              Number.isNaN(dueMs)
            ) {
              continue;
            }

            const days =
              Math.ceil(
                (dueMs - now) /
                  86400000
              );

            const dueKey =
              due
                .toISOString()
                .slice(0, 10);

            if (dueMs < now) {
              await upsert({
                id:
                  `membership-expired:${client.id}:${dueKey}`,
                sourceKey:
                  `membership-expired:${client.id}:${dueKey}`,
                type:
                  'membership_expired',
                title:
                  'Membership expired',
                body:
                  `${client.name}'s membership has expired. Receive fee to renew.`,
                createdAt:
                  due.toISOString(),
                readAt: null,
                data: {
                  clientId:
                    client.id,
                },
              });
            } else if (
              days <= 3
            ) {
              await upsert({
                id:
                  `membership-due:${client.id}:${dueKey}`,
                sourceKey:
                  `membership-due:${client.id}:${dueKey}`,
                type:
                  'membership_due',
                title:
                  days <= 1
                    ? 'Membership due tomorrow'
                    : 'Membership due soon',
                body:
                  `${client.name}'s membership is due ${days <= 1 ? 'tomorrow' : `in ${days} days`}.`,
                createdAt:
                  new Date().toISOString(),
                readAt: null,
                data: {
                  clientId:
                    client.id,
                },
              });
            }
          }
        } catch (error) {
          console.error(
            'Membership notification sync failed:',
            error
          );
        }
      }, [
        user?.id,
        activeGymId,
        upsert,
      ]);

    useEffect(() => {
      if (
        !storageKey
      ) {
        return;
      }

      syncMembershipAlerts();
    }, [
      storageKey,
      syncMembershipAlerts,
    ]);

    useEffect(() => {
      const subscription =
        ExpoNotifications
          .addNotificationReceivedListener(
            notification => {
              const content =
                notification
                  .request
                  .content;

              const data =
                (content.data ||
                  {}) as Record<
                  string,
                  any
                >;

              const type =
                String(
                  data.type ||
                  'device_notification'
                );

              const businessKey =
                data.paymentId
                  ? `payment:${data.paymentId}`
                  : data.clientId
                  ? `${type}:${data.clientId}`
                  : `expo:${notification.request.identifier}`;

              upsert({
                id: businessKey,
                sourceKey:
                  businessKey,
                type,
                title:
                  content.title ||
                  'Gym notification',
                body:
                  content.body ||
                  '',
                createdAt:
                  new Date().toISOString(),
                readAt: null,
                data,
              }).catch(error =>
                console.error(
                  'Device notification center sync failed:',
                  error
                )
              );

              refreshNow();
            }
          );

      return () => {
        subscription.remove();
      };
    }, [
      upsert,
      refreshNow,
    ]);

    const markRead =
      useCallback(
        async (id: string) => {
          const now =
            new Date()
              .toISOString();

          await persist(
            itemsRef.current.map(
              item =>
                item.id === id &&
                !item.readAt
                  ? {
                      ...item,
                      readAt:
                        now,
                    }
                  : item
            )
          );
        },
        [persist]
      );

    const markAllRead =
      useCallback(async () => {
        const now =
          new Date()
            .toISOString();

        await persist(
          itemsRef.current.map(
            item =>
              item.readAt
                ? item
                : {
                    ...item,
                    readAt:
                      now,
                  }
          )
        );
      }, [persist]);

    const clearAll =
      useCallback(async () => {
        await persist([]);
      }, [persist]);

    const refresh =
      useCallback(async () => {
        setRefreshing(true);

        try {
          refreshNow();
          await syncMembershipAlerts();
        } finally {
          setRefreshing(false);
        }
      }, [
        refreshNow,
        syncMembershipAlerts,
      ]);

    const unreadCount =
      useMemo(
        () =>
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (item.readAt
                ? 0
                : 1),
            0
          ),
        [items]
      );

    const value =
      useMemo<
        NotificationCenterContextValue
      >(
        () => ({
          items,
          unreadCount,
          realtimeConnected,
          refreshing,
          markRead,
          markAllRead,
          clearAll,
          refresh,
        }),
        [
          items,
          unreadCount,
          realtimeConnected,
          refreshing,
          markRead,
          markAllRead,
          clearAll,
          refresh,
        ]
      );

    return (
      <NotificationCenterContext.Provider
        value={value}
      >
        {children}
      </NotificationCenterContext.Provider>
    );
  };

export const useNotificationCenter =
  () => {
    const context =
      useContext(
        NotificationCenterContext
      );

    if (!context) {
      throw new Error(
        'useNotificationCenter must be used inside NotificationCenterProvider'
      );
    }

    return context;
  };
