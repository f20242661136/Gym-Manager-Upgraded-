import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACTIVE_GYM_STORAGE_KEY = 'active_gym_id';

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

export const getUserGyms = async () => {
  const { data: { user } } = await supabase.auth.getUser();
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
    .map((gym: any) => ({
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      logoUrl: gym.logo_url ?? null,
      phone: gym.phone ?? null,
      email: gym.email ?? null,
      address: gym.address ?? null,
      status: gym.status,
      createdAt: gym.created_at,
      updatedAt: gym.updated_at,
    }));
};

export const createGym = async (input: {
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in to create a gym.');
  }

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .insert([
      {
        name: input.name,
        slug: input.slug,
        logo_url: input.logoUrl ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        status: 'active',
      },
    ])
    .select()
    .single();

  if (gymError) {
    throw gymError;
  }

  const { error: membershipError } = await supabase.from('gym_users').insert([
    {
      gym_id: gym.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    },
  ]);

  if (membershipError) {
    throw membershipError;
  }

  await setCurrentGymId(gym.id);
  return gym;
};

export const joinGymBySlug = async (slug: string) => {
  const normalisedSlug = slug.trim().toLowerCase();
  if (!normalisedSlug) {
    throw new Error('Gym slug is required.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in to join a gym.');
  }

  const { data: gym, error: gymLookupError } = await supabase
    .from('gyms')
    .select('*')
    .eq('slug', normalisedSlug)
    .maybeSingle();

  if (gymLookupError) {
    throw gymLookupError;
  }

  if (!gym) {
    throw new Error('No gym was found for that slug.');
  }

  const { data: existingMembership } = await supabase
    .from('gym_users')
    .select('id, status')
    .eq('gym_id', gym.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership?.status === 'active') {
    await setCurrentGymId(gym.id);
    return gym;
  }

  const { data: membership, error: joinError } = await supabase
    .from('gym_users')
    .insert([
      {
        gym_id: gym.id,
        user_id: user.id,
        role: 'staff',
        status: 'active',
      },
    ])
    .select()
    .single();

  if (joinError) {
    throw joinError;
  }

  await setCurrentGymId(gym.id);
  return gym;
};
