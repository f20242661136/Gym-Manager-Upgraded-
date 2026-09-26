import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Client, Payment } from '../types';

type Scope = {
  userId: string;
  gymId: string;
};

let currentScope: Scope | null = null;

const LEGACY_KEYS = [
  '@gym_app_clients',
  '@gym_app_payments',
  'offline_queue',
];

const requireScope = (): Scope => {
  if (!currentScope) {
    throw new Error(
      'Local storage scope is not ready. Sign in and select a gym first.'
    );
  }

  return currentScope;
};

const key = (
  kind: 'clients' | 'payments' | 'meta'
) => {
  const scope = requireScope();

  return [
    '@gym_app',
    'v2',
    scope.userId,
    scope.gymId,
    kind,
  ].join(':');
};

export const storage = {
  setScope: (
    userId: string | null | undefined,
    gymId: string | null | undefined
  ) => {
    currentScope =
      userId && gymId
        ? { userId, gymId }
        : null;
  },

  getScope: () => currentScope,

  clearLegacyUnscoped: async () => {
    await AsyncStorage.multiRemove(
      LEGACY_KEYS
    );
  },

  saveClients: async (
    clients: Client[]
  ): Promise<void> => {
    if (!currentScope) return;

    await AsyncStorage.setItem(
      key('clients'),
      JSON.stringify(clients)
    );
  },

  getClients: async (): Promise<
    Client[]
  > => {
    if (!currentScope) return [];

    try {
      const raw =
        await AsyncStorage.getItem(
          key('clients')
        );

      return raw
        ? JSON.parse(raw)
        : [];
    } catch (error) {
      console.error(
        'Error loading scoped clients:',
        error
      );

      return [];
    }
  },

  savePayments: async (
    payments: Payment[]
  ): Promise<void> => {
    if (!currentScope) return;

    await AsyncStorage.setItem(
      key('payments'),
      JSON.stringify(payments)
    );
  },

  getPayments: async (): Promise<
    Payment[]
  > => {
    if (!currentScope) return [];

    try {
      const raw =
        await AsyncStorage.getItem(
          key('payments')
        );

      return raw
        ? JSON.parse(raw)
        : [];
    } catch (error) {
      console.error(
        'Error loading scoped payments:',
        error
      );

      return [];
    }
  },

  clearAll: async (): Promise<void> => {
    if (!currentScope) return;

    await AsyncStorage.multiRemove([
      key('clients'),
      key('payments'),
      key('meta'),
    ]);
  },

  setItem: async (
    itemKey: string,
    value: string
  ): Promise<void> => {
    await AsyncStorage.setItem(
      itemKey,
      value
    );
  },

  getItem: async (
    itemKey: string
  ): Promise<string | null> => {
    return AsyncStorage.getItem(
      itemKey
    );
  },
};