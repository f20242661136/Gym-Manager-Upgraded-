import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { CountryCode } from '../types';
import type { Gym } from '../types/gym';

const ACTIVE_GYM_STORAGE_KEY = 'active_gym_id';

const mapGym = (gym: any): Gym => ({
  id: gym.id,
  name: gym.name,
  slug: gym.slug,
  logoUrl: gym.logo_url ?? null,
  phone: gym.phone ?? null,
  email: gym.email ?? null,
  address: gym.address ?? null,
  countryCode: gym.country_code === 'IN' ? 'IN' : 'PK',
  currencyCode: gym.currency_code === 'INR' ? 'INR' : 'PKR',
  timezone: gym.timezone ?? (gym.country_code === 'IN' ? 'Asia/Kolkata' : 'Asia/Karachi'),
  locale: gym.locale ?? (gym.country_code === 'IN' ? 'en-IN' : 'en-PK'),
  joinCode: gym.join_code ?? null,
  status: gym.status,
  createdAt: gym.created_at,
  updatedAt: gym.updated_at,
});

export const getCurrentGymId = async (): Promise<string | null> => {
  try {
    return (await AsyncStorage.getItem(ACTIVE_GYM_STORAGE_KEY)) || null;
  } catch (error) {
    console.error('Error reading active gym id:', error);
    return null;
  }
};

export const setCurrentGymId = async (gymId: string | null): Promise<void> => {
  try {
    if (!gymId) {
      await AsyncStorage.removeItem(ACTIVE_GYM_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(ACTIVE_GYM_STORAGE_KEY, gymId);
  } catch (error) {
    console.error('Error saving active gym id:', error);
  }
};

export const getUserGyms = async (): Promise<Gym[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('gym_users')
    .select(`
      id,
      gym_id,
      role,
      status,
      gyms (
        id,
        name,
        slug,
        logo_url,
        phone,
        email,
        address,
        country_code,
        currency_code,
        timezone,
        locale,
        join_code,
        status,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => row.gyms)
    .filter(Boolean)
    .map(mapGym);
};

export const createGym = async (input: {
  name: string;
  slug: string;
  countryCode?: CountryCode;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): Promise<Gym> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to create a gym.');
  }

  const { data, error } = await supabase.rpc('create_gym', {
    p_name: input.name,
    p_slug: input.slug,
    p_country_code: input.countryCode ?? 'PK',
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_logo_url: input.logoUrl ?? null,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Gym could not be created.');
  }

  const gym = mapGym(data);
  await setCurrentGymId(gym.id);
  return gym;
};

export const joinGymByCode = async (joinCode: string): Promise<Gym> => {
  const code = joinCode.trim().toUpperCase();

  if (!code) {
    throw new Error('Gym join code is required.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to join a gym.');
  }

  const { data, error } = await supabase.rpc('join_gym_by_code', {
    p_join_code: code,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No gym was found for that join code.');
  }

  const gym = mapGym(data);
  await setCurrentGymId(gym.id);
  return gym;
};

// Temporary compatibility alias in case another old import still exists.
export const joinGymBySlug = joinGymByCode;