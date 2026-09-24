import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { Gym } from '../types/gym';
import { getCurrentGymId, getUserGyms, setCurrentGymId } from '../services/gymService';

interface GymContextType {
  gyms: Gym[];
  activeGym: Gym | null;
  activeGymId: string | null;
  isLoading: boolean;
  refreshGyms: () => Promise<void>;
  setActiveGym: (gymId: string | null) => Promise<void>;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshGyms = async () => {
    if (!user?.id) {
      setGyms([]);
      setActiveGymId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const gymRows = await getUserGyms();
      setGyms(gymRows);

      const storedActiveGymId = await getCurrentGymId();
      const nextActiveGymId = gymRows.some(g => g.id === storedActiveGymId)
        ? storedActiveGymId
        : gymRows[0]?.id ?? null;

      setActiveGymId(nextActiveGymId);
      await setCurrentGymId(nextActiveGymId);
    } catch (error) {
      console.error('Error loading gyms for user:', error);
      setGyms([]);
      setActiveGymId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveGym = async (gymId: string | null) => {
    setActiveGymId(gymId);
    await setCurrentGymId(gymId);
  };

  useEffect(() => {
    if (!user?.id) {
      setGyms([]);
      setActiveGymId(null);
      setIsLoading(false);
      return;
    }

    refreshGyms().catch((error) => {
      console.error('Failed to refresh gyms:', error);
    });
  }, [user?.id]);

  const activeGym = useMemo(
    () => gyms.find(gym => gym.id === activeGymId) ?? null,
    [gyms, activeGymId]
  );

  const value = useMemo<GymContextType>(() => ({
    gyms,
    activeGym,
    activeGymId,
    isLoading,
    refreshGyms,
    setActiveGym,
  }), [gyms, activeGym, activeGymId, isLoading]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
};
