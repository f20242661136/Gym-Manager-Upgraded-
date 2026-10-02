import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { useGym } from './GymContext';
import {
  offlineQueue,
  type QueueSnapshot,
} from '../services/offlineQueue';
import { storage } from '../services/storage';

type SyncState =
  | 'idle'
  | 'offline'
  | 'syncing'
  | 'attention';

interface SyncContextValue {
  isConnected: boolean;
  state: SyncState;
  queue: QueueSnapshot;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

const EMPTY_QUEUE: QueueSnapshot = {
  pending: 0,
  failed: 0,
  processing: 0,
  total: 0,
};

const SyncContext =
  createContext<SyncContextValue | null>(
    null
  );

export const useSync = () => {
  const value =
    useContext(SyncContext);

  if (!value) {
    throw new Error(
      'useSync must be used inside SyncProvider'
    );
  }

  return value;
};

export const SyncProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const { activeGymId } = useGym();

  const [isConnected, setConnected] =
    useState(true);
  const [state, setState] =
    useState<SyncState>('idle');
  const [queue, setQueue] =
    useState<QueueSnapshot>(
      EMPTY_QUEUE
    );

  const running = useRef(false);
  const connectedRef = useRef(true);

  const refreshQueue =
    useCallback(async () => {
      const snapshot =
        await offlineQueue.getSnapshot();

      setQueue(snapshot);

      if (!isConnected) {
        setState('offline');
      } else if (
        snapshot.failed > 0
      ) {
        setState('attention');
      } else if (
        snapshot.processing > 0
      ) {
        setState('syncing');
      } else {
        setState('idle');
      }
    }, [isConnected]);

  const syncNow =
    useCallback(async () => {
      if (
        running.current ||
        !connectedRef.current ||
        !user?.id ||
        !activeGymId
      ) {
        return;
      }

      try {
        running.current = true;
        setState('syncing');

        const snapshot =
          await offlineQueue.processQueue();

        setQueue(snapshot);

        setState(
          snapshot.failed > 0
            ? 'attention'
            : 'idle'
        );
      } catch (error) {
        console.error(
          'Offline queue sync failed:',
          error
        );

        setState('attention');
      } finally {
        running.current = false;
      }
    }, [
      activeGymId,
      user?.id,
    ]);

  const retryFailed =
    useCallback(async () => {
      await offlineQueue.retryFailed();
      await refreshQueue();
      await syncNow();
    }, [
      refreshQueue,
      syncNow,
    ]);

  useEffect(() => {
    storage.setScope(
      user?.id,
      activeGymId
    );

    offlineQueue.setScope(
      user?.id,
      activeGymId
    );

    if (
      user?.id &&
      activeGymId
    ) {
      storage
        .clearLegacyUnscoped()
        .catch(error =>
          console.error(
            'Legacy cache cleanup failed:',
            error
          )
        );
    }

    refreshQueue().catch(() => {});
  }, [
    activeGymId,
    refreshQueue,
    user?.id,
  ]);

  useEffect(() => {
    const unsubscribeQueue =
      offlineQueue.subscribe(
        snapshot => {
          setQueue(snapshot);

          if (!isConnected) {
            setState('offline');
          } else if (
            snapshot.failed > 0
          ) {
            setState('attention');
          }
        }
      );

    return unsubscribeQueue;
  }, [isConnected]);

  useEffect(() => {
    const unsubscribe =
      NetInfo.addEventListener(
        netState => {
          const connected =
            Boolean(
              netState.isConnected &&
                netState
                  .isInternetReachable !==
                  false
            );

          connectedRef.current = connected;
          setConnected(connected);

          if (!connected) {
            setState('offline');
            return;
          }

          setTimeout(() => {
            syncNow().catch(() => {});
          }, 350);
        }
      );

    return unsubscribe;
  }, [syncNow]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {
          if (
            nextState === 'active' &&
            connectedRef.current
          ) {
            syncNow().catch(() => {});
          }
        }
      );

    return () =>
      subscription.remove();
  }, [
    isConnected,
    syncNow,
  ]);

  const value =
    useMemo<SyncContextValue>(
      () => ({
        isConnected,
        state,
        queue,
        syncNow,
        retryFailed,
      }),
      [
        isConnected,
        queue,
        retryFailed,
        state,
        syncNow,
      ]
    );

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};