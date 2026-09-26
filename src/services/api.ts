import { supabase } from './supabase';
import { Client, Payment, DashboardStats } from '../types/index';
import { storage } from './storage';
import { offlineQueue, createOfflineUuid } from './offlineQueue';
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


const resolvePrivatePhotoUrl = async (
  photoPath?: string | null,
  fallbackUrl?: string | null
): Promise<string> => {
  if (!photoPath) {
    return fallbackUrl || '';
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from('client-photos-private')
    .createSignedUrl(
      photoPath,
      7 * 24 * 60 * 60
    );

  if (error) {
    console.warn(
      'Could not refresh member photo URL:',
      error.message
    );

    return fallbackUrl || '';
  }

  return data.signedUrl;
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
      const clients: Client[] =
        await Promise.all(
          (data || []).map(
            async item => ({

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
        photoUrl:
          await resolvePrivatePhotoUrl(
            (item as any).photo_path,
            item.photo_url
          ),
        photoPath:
          (item as any).photo_path ?? null,
        membershipStatus: item.membership_status,
        registrationDate: item.registration_date,
        membershipDueDate: item.membership_due_date,
        serverUpdatedAt: (item as any).updated_at ?? null,
        syncVersion: (item as any).sync_version ?? null,
        syncState: 'synced',
      
            })
          )
        );

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
        photoUrl:
          await resolvePrivatePhotoUrl(
            (data as any).photo_path,
            data.photo_url
          ),
        photoPath:
          (data as any).photo_path ?? null,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
        serverUpdatedAt: (data as any).updated_at ?? null,
        syncVersion: (data as any).sync_version ?? null,
        syncState: 'synced',
      } : undefined;
    } catch (error) {
      console.error('Error fetching client:', error);
      const clients = await storage.getClients();
      return clients.find(client => client.id === id);
    }
  },

  addClient: async (client: Omit<Client, 'id'>, isConnected: boolean): Promise<Client> => {
    const activeGymId = await requireActiveGymId();
    const clientId = createOfflineUuid();

    const clientData = {
      id: clientId,
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
      photo_path:
        client.photoPath ?? null,
      membership_status: client.membershipStatus,
      registration_date: client.registrationDate,
      membership_due_date: toNullableTimestamp(client.membershipDueDate),
    };

    try {
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
        photoUrl:
          await resolvePrivatePhotoUrl(
            (data as any).photo_path,
            data.photo_url
          ),
        photoPath:
          (data as any).photo_path ?? null,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
        serverUpdatedAt: (data as any).updated_at ?? null,
        syncVersion: (data as any).sync_version ?? null,
        syncState: 'synced',
      };

      const clients = await storage.getClients();
      const index = clients.findIndex(item => item.id === clientId);

      if (index >= 0) {
        clients[index] = newClient;
      } else {
        clients.push(newClient);
      }

      await storage.saveClients(clients);
      return newClient;
    } catch (error) {
      console.error('Error adding client:', error);

      if (!shouldFallbackToLocalStorage(isConnected, error)) {
        throw error;
      }

      const newClient: Client = {
        ...client,
        id: clientId,
        serverUpdatedAt: null,
        syncVersion: 0,
        syncState: 'pending',
      };

      const clients = await storage.getClients();
      clients.push(newClient);
      await storage.saveClients(clients);

      await offlineQueue.enqueueClientCreate(
        clientId,
        clientData
      );

      return newClient;
    }
  },

  updateClient: async (id: string, client: Client, isConnected: boolean): Promise<Client> => {
    const activeGymId = await requireActiveGymId();

    // Profile edits intentionally do not write membership/payment fields.
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
      photo_path:
        client.photoPath ?? null,
      };

    try {
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
        photoUrl:
          await resolvePrivatePhotoUrl(
            (data as any).photo_path,
            data.photo_url
          ),
        photoPath:
          (data as any).photo_path ?? null,
        membershipStatus: data.membership_status,
        registrationDate: data.registration_date,
        membershipDueDate: data.membership_due_date,
        serverUpdatedAt: (data as any).updated_at ?? null,
        syncVersion: (data as any).sync_version ?? null,
        syncState: 'synced',
      };

      const clients = await storage.getClients();
      const index = clients.findIndex(item => item.id === id);

      if (index >= 0) {
        clients[index] = updatedClient;
        await storage.saveClients(clients);
      }

      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);

      if (!shouldFallbackToLocalStorage(isConnected, error)) {
        throw error;
      }

      const pendingClient: Client = {
        ...client,
        syncState: 'pending',
      };

      const clients = await storage.getClients();
      const index = clients.findIndex(item => item.id === id);

      if (index >= 0) {
        clients[index] = pendingClient;
        await storage.saveClients(clients);
      }

      await offlineQueue.enqueueClientUpdate(
        id,
        clientData,
        client.syncVersion
      );

      return pendingClient;
    }
  },

  deleteClient: async (id: string): Promise<void> => {
    const activeGymId = await requireActiveGymId();
    const clients = await storage.getClients();
    const target = clients.find(item => item.id === id);

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('gym_id', activeGymId);

      if (error) throw error;

      await storage.saveClients(
        clients.filter(item => item.id !== id)
      );
    } catch (error) {
      console.error('Error deleting client:', error);

      if (!shouldFallbackToLocalStorage(undefined, error)) {
        throw error;
      }

      await storage.saveClients(
        clients.filter(item => item.id !== id)
      );

      await offlineQueue.enqueueClientDelete(
        id,
        target?.syncVersion
      );
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
        paymentMethod: item.payment_method || 'cash',
        referenceNumber: item.reference_number ?? null,
        providerTransactionId: item.provider_transaction_id ?? null,
        notes: item.notes ?? null,
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

  addPayment: async (_payment: Omit<Payment, 'id'>, _isConnected: boolean): Promise<Payment> => {
    throw new Error(
      'Legacy payment API is disabled. Record payments through the membership payment flow so the server can commit payment + membership atomically.'
    );
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
  uploadImage: async (
    uri: string,
    fileName: string
  ): Promise<{
    url: string;
    path: string | null;
  }> => {
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
      const storagePath = `${activeGymId}/client-photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('client-photos-private')
        .upload(storagePath, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const {
        data: signed,
        error: signedError,
      } = await supabase.storage
        .from('client-photos-private')
        .createSignedUrl(
          storagePath,
          7 * 24 * 60 * 60
        );

      if (signedError) {
        throw signedError;
      }

      return {
        url: signed.signedUrl,
        path: storagePath,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      if (!shouldFallbackToLocalStorage(undefined, error)) {
        throw error;
      }
      // Return the local URI as fallback
      return {
        url: uri,
        path: null,
      };
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

      const clients: Client[] =
        await Promise.all(
          (data || []).map(
            async item => ({

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
        photoUrl:
          await resolvePrivatePhotoUrl(
            (item as any).photo_path,
            item.photo_url
          ),
        photoPath:
          (item as any).photo_path ?? null,
        membershipStatus: item.membership_status,
        registrationDate: item.registration_date,
        membershipDueDate: item.membership_due_date,
        serverUpdatedAt: (item as any).updated_at ?? null,
        syncVersion: (item as any).sync_version ?? null,
        syncState: 'synced',
      
            })
          )
        );

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
        paymentMethod: item.payment_method || 'cash',
        referenceNumber: item.reference_number ?? null,
        providerTransactionId: item.provider_transaction_id ?? null,
        notes: item.notes ?? null,
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
    await offlineQueue.processQueue();
  },
};
