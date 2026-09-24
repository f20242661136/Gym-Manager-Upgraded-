import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Payment } from '../types';

const STORAGE_KEYS = {
  CLIENTS: '@gym_app_clients',
  PAYMENTS: '@gym_app_payments',
};

export const storage = {
  // Clients
  saveClients: async (clients: Client[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (error) {
      console.error('Error saving clients:', error);
      throw new Error('Failed to save clients');
    }
  },

  getClients: async (): Promise<Client[]> => {
    try {
      const clientsJson = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTS);
      return clientsJson ? JSON.parse(clientsJson) : [];
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  },

  // Payments
  savePayments: async (payments: Payment[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    } catch (error) {
      console.error('Error saving payments:', error);
      throw new Error('Failed to save payments');
    }
  },

  getPayments: async (): Promise<Payment[]> => {
    try {
      const paymentsJson = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return paymentsJson ? JSON.parse(paymentsJson) : [];
    } catch (error) {
      console.error('Error loading payments:', error);
      return [];
    }
  },

  // Clear all data (for debugging)
  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.CLIENTS, STORAGE_KEYS.PAYMENTS]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Generic key-value storage
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving item:', error);
      throw new Error('Failed to save item');
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },
};
