import { supabase } from './supabase';
import { Client, Payment, DashboardStats } from '../types/index';
import { storage } from './storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { getCurrentGymId } from './gymService';

const shouldFallbackToLocalStorage = (isConnected: boolean | undefined, error: any): boolean => {
  if (typeof isConnected === 'boolean') {
    return !isConnected;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return !navigator.onLine;
  }

  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('offline') || message.includes('network') || message.includes('fetch');
};

const toNullableTimestamp = (value?: string | null): string | null => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
};

const requireActiveGymId = async (): Promise<string> => {
  const activeGymId = await getCurrentGymId();
  if (!activeGymId) {
    throw new Error('No active gym selected.');
  }
  return activeGymId;
};

export const api = {
  // Client APIs
  getClients: async (): Promise<Client[]> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('gym_id', activeGymId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert from Supabase snake_case to our camelCase
      const clients: Client[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        age: item.age,
        gender: item.gender,
        weight: item.weight,
        height: item.height,
        chest: item.chest,
        waist: item.waist,
        bmi: item.bmi,
        photoUrl: item.photo_url,
        membershipStatus: item.membership_status,
        registrationDate: item.registration_date,
        membershipDueDate: item.membership_due_date,
      })) || [];

      // Cache for offline use
      await storage.saveClients(clients);

      return clients;
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Fallback to local storage
      return await storage.getClients();
    }
  },

  getClient: async (id: string): Promise<Client | undefined> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('gym_id', activeGymId)
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        chest: data.chest,
        waist: data.waist,
        bmi: data.bmi,
        photoUrl: data.photo_url,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
      } : undefined;
    } catch (error) {
      console.error('Error fetching client:', error);
      const clients = await storage.getClients();
      return clients.find(client => client.id === id);
    }
  },

  addClient: async (client: Omit<Client, 'id'>, isConnected: boolean): Promise<Client> => {
    try {
      const activeGymId = await requireActiveGymId();

      // Convert to snake_case for Supabase
      const clientData = {
        gym_id: activeGymId,
        name: client.name,
        phone: client.phone,
        email: client.email,
        age: client.age,
        gender: client.gender,
        weight: client.weight,
        height: client.height,
        chest: client.chest,
        waist: client.waist,
        bmi: client.bmi,
        photo_url: client.photoUrl,
        membership_status: client.membershipStatus,
        registration_date: client.registrationDate,
        membership_due_date: toNullableTimestamp(client.membershipDueDate),
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      const newClient: Client = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        chest: data.chest,
        waist: data.waist,
        bmi: data.bmi,
        photoUrl: data.photo_url,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
      };

      // Update local cache
      const clients = await storage.getClients();
      clients.push(newClient);
      await storage.saveClients(clients);

      return newClient;
    } catch (error) {
      console.error('Error adding client:', error);
      if (!shouldFallbackToLocalStorage(isConnected, error)) {
        throw error;
      }
      // Save locally if online fails
      const clients = await storage.getClients();
      const newClient: Client = {
        ...client,
        id: `local_${Date.now()}`,
      };
      clients.push(newClient);
      await storage.saveClients(clients);
      return newClient;
    }
  },

  updateClient: async (id: string, client: Client, isConnected: boolean): Promise<Client> => {
    try {
      const activeGymId = await requireActiveGymId();
      const clientData = {
        name: client.name,
        phone: client.phone,
        email: client.email,
        age: client.age,
        gender: client.gender,
        weight: client.weight,
        height: client.height,
        chest: client.chest,
        waist: client.waist,
        bmi: client.bmi,
        photo_url: client.photoUrl,
        membership_status: client.membershipStatus,
        registration_date: client.registrationDate,
        membership_due_date: toNullableTimestamp(client.membershipDueDate),
      };

      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id)
        .eq('gym_id', activeGymId)
        .select()
        .single();

      if (error) throw error;

      const updatedClient: Client = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        chest: data.chest,
        waist: data.waist,
        bmi: data.bmi,
        photoUrl: data.photo_url,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
      };

      // Update local cache
      const clients = await storage.getClients();
      const index = clients.findIndex(c => c.id === id);
      if (index !== -1) {
        clients[index] = updatedClient;
        await storage.saveClients(clients);
      }

      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      if (!shouldFallbackToLocalStorage(isConnected, error)) {
        throw error;
      }
      // Update locally if online fails
      const clients = await storage.getClients();
      const index = clients.findIndex(c => c.id === id);
      if (index !== -1) {
        clients[index] = client;
        await storage.saveClients(clients);
      }
      return client;
    }
  },

  deleteClient: async (id: string): Promise<void> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('gym_id', activeGymId);

      if (error) throw error;

      // Update local cache
      const clients = await storage.getClients();
      const filteredClients = clients.filter(client => client.id !== id);
      await storage.saveClients(filteredClients);
    } catch (error) {
      console.error('Error deleting client:', error);
      if (!shouldFallbackToLocalStorage(undefined, error)) {
        throw error;
      }
      // Delete locally if online fails
      const clients = await storage.getClients();
      const filteredClients = clients.filter(client => client.id !== id);
      await storage.saveClients(filteredClients);
    }
  },

  // Payment APIs
  getPayments: async (clientId?: string): Promise<Payment[]> => {
    try {
      const activeGymId = await requireActiveGymId();
      let query = supabase
        .from('payments')
        .select('*')
        .eq('gym_id', activeGymId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const payments: Payment[] = data?.map(item => ({
        id: item.id,
        clientId: item.client_id,
        clientName: item.client_name,
        amount: item.amount,
        paymentDate: item.payment_date,
        dueDate: item.due_date,
        status: item.status,
        duration: item.duration || 1,
      })) || [];

      // Cache for offline use
      await storage.savePayments(payments);

      return payments;
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Fallback to local storage
      const payments = await storage.getPayments();
      if (clientId) {
        return payments.filter(payment => payment.clientId === clientId);
      }
      return payments;
    }
  },

  addPayment: async (payment: Omit<Payment, 'id'>, isConnected: boolean): Promise<Payment> => {
    try {
      const activeGymId = await requireActiveGymId();
      const paymentData = {
        gym_id: activeGymId,
        client_id: payment.clientId,
        client_name: payment.clientName,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        due_date: payment.dueDate,
        status: payment.status,
        duration: payment.duration,
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      const newPayment: Payment = {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        amount: data.amount,
        paymentDate: data.payment_date,
        dueDate: data.due_date,
        status: data.status,
        duration: data.duration || 1,
      };

      // Update client membership status
      await supabase
        .from('clients')
        .update({
          membership_status: 'Paid',
          membership_due_date: payment.dueDate,
        })
        .eq('id', payment.clientId)
        .eq('gym_id', activeGymId);

      // Update local cache
      const payments = await storage.getPayments();
      payments.push(newPayment);
      await storage.savePayments(payments);

      // Update local client data
      const clients = await storage.getClients();
      const clientIndex = clients.findIndex(c => c.id === payment.clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].membershipStatus = 'Paid';
        clients[clientIndex].membershipDueDate = payment.dueDate;
        await storage.saveClients(clients);
      }

      return newPayment;
    } catch (error) {
      console.error('Error adding payment:', error);
      if (!shouldFallbackToLocalStorage(isConnected, error)) {
        throw error;
      }
      // Save locally if online fails
      const payments = await storage.getPayments();
      const newPayment: Payment = {
        ...payment,
        id: `local_${Date.now()}`,
      };
      payments.push(newPayment);
      await storage.savePayments(payments);

      // Update local client
      const clients = await storage.getClients();
      const clientIndex = clients.findIndex(c => c.id === payment.clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].membershipStatus = 'Paid';
        clients[clientIndex].membershipDueDate = payment.dueDate;
        await storage.saveClients(clients);
      }

      return newPayment;
    }
  },

  // Dashboard APIs
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { data: clients, error } = await supabase
        .from('clients')
        .select('membership_status')
        .eq('gym_id', activeGymId);

      if (error) throw error;

      const totalClients = clients?.length || 0;
      const paidClients = clients?.filter(c => c.membership_status === 'Paid').length || 0;
      const unpaidClients = clients?.filter(c => c.membership_status === 'Unpaid').length || 0;

      return {
        totalClients,
        paidClients,
        unpaidClients,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Fallback to local data
      const clients = await storage.getClients();
      return {
        totalClients: clients.length,
        paidClients: clients.filter(c => c.membershipStatus === 'Paid').length,
        unpaidClients: clients.filter(c => c.membershipStatus === 'Unpaid').length,
      };
    }
  },

  // Image Upload
  uploadImage: async (uri: string, fileName: string): Promise<string> => {
    try {
      // Read the file as base64 using expo-file-system legacy API
      const fileInfo = await FileSystemLegacy.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array for Supabase upload
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const activeGymId = await requireActiveGymId();
      const storagePath = `gyms/${activeGymId}/client-photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('client-photos')
        .upload(storagePath, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(storagePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      if (!shouldFallbackToLocalStorage(undefined, error)) {
        throw error;
      }
      // Return the local URI as fallback
      return uri;
    }
  },

  // Get recent clients (last 5)
  getRecentClients: async (): Promise<Client[]> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('gym_id', activeGymId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const clients: Client[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        age: item.age,
        gender: item.gender,
        weight: item.weight,
        height: item.height,
        chest: item.chest,
        waist: item.waist,
        bmi: item.bmi,
        photoUrl: item.photo_url,
        membershipStatus: item.membership_status,
        registrationDate: item.registration_date,
        membershipDueDate: item.membership_due_date,
      })) || [];

      return clients;
    } catch (error) {
      console.error('Error fetching recent clients:', error);
      // Fallback to local storage
      const clients = await storage.getClients();
      return clients.slice(0, 5);
    }
  },

  // Get recent payments (last 5)
  getRecentPayments: async (): Promise<Payment[]> => {
    try {
      const activeGymId = await requireActiveGymId();
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('gym_id', activeGymId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const payments: Payment[] = data?.map(item => ({
        id: item.id,
        clientId: item.client_id,
        clientName: item.client_name,
        amount: item.amount,
        paymentDate: item.payment_date,
        dueDate: item.due_date,
        status: item.status,
        duration: item.duration || 1,
      })) || [];

      return payments;
    } catch (error) {
      console.error('Error fetching recent payments:', error);
      // Fallback to local storage
      const payments = await storage.getPayments();
      return payments.slice(0, 5);
    }
  },

  // Sync local data with server
  syncLocalData: async (): Promise<void> => {
    try {
      // This would sync any locally created data when coming back online
      // Implementation depends on your specific needs
      console.log('Syncing local data with server...');
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  },
};
