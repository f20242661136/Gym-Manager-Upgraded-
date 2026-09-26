import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
} from 'react-native';

import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useGym } from './GymContext';

export type LiveDataEvent = {
  table: string;
  eventType: string;
  newRow: Record<string, any> | null;
  oldRow: Record<string, any> | null;
  commitTimestamp?: string;
  receivedAt: number;
};

type LiveDataContextValue = {
  revision: number;
  lastEvent: LiveDataEvent | null;
  realtimeConnected: boolean;
  refreshNow: () => void;
};

const LiveDataContext =
  createContext<LiveDataContextValue | null>(null);

const rowGymId = (
  row: Record<string, any> | null | undefined
) =>
  row?.gym_id ??
  row?.gymId ??
  null;

export const LiveDataProvider: React.FC<
  React.PropsWithChildren
> = ({ children }) => {
  const { user } = useAuth();
  const {
    activeGymId,
  } = useGym();

  const [
    revision,
    setRevision,
  ] = useState(0);

  const [
    lastEvent,
    setLastEvent,
  ] = useState<LiveDataEvent | null>(
    null
  );

  const [
    realtimeConnected,
    setRealtimeConnected,
  ] = useState(false);

  const refreshNow =
    useCallback(() => {
      setRevision(value => value + 1);
    }, []);

  useEffect(() => {
    if (!user || !activeGymId) {
      setRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel(
        `gym-live-data-${activeGymId}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload: any) => {
          const next =
            (payload?.new &&
              Object.keys(
                payload.new
              ).length
              ? payload.new
              : null) as
              | Record<string, any>
              | null;

          const previous =
            (payload?.old &&
              Object.keys(
                payload.old
              ).length
              ? payload.old
              : null) as
              | Record<string, any>
              | null;

          const eventGymId =
            rowGymId(next) ??
            rowGymId(previous);

          if (
            eventGymId &&
            eventGymId !==
              activeGymId
          ) {
            return;
          }

          setLastEvent({
            table:
              payload?.table ||
              'unknown',
            eventType:
              payload?.eventType ||
              'UNKNOWN',
            newRow: next,
            oldRow: previous,
            commitTimestamp:
              payload?.commit_timestamp,
            receivedAt:
              Date.now(),
          });

          setRevision(
            value => value + 1
          );
        }
      )
      .subscribe(status => {
        setRealtimeConnected(
          status === 'SUBSCRIBED'
        );
      });

    return () => {
      setRealtimeConnected(false);
      supabase
        .removeChannel(channel)
        .catch(() => undefined);
    };
  }, [user?.id, activeGymId]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (
          nextState: AppStateStatus
        ) => {
          if (
            nextState === 'active'
          ) {
            refreshNow();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [refreshNow]);

  const value =
    useMemo<LiveDataContextValue>(
      () => ({
        revision,
        lastEvent,
        realtimeConnected,
        refreshNow,
      }),
      [
        revision,
        lastEvent,
        realtimeConnected,
        refreshNow,
      ]
    );

  return (
    <LiveDataContext.Provider
      value={value}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context =
    useContext(LiveDataContext);

  if (!context) {
    throw new Error(
      'useLiveData must be used inside LiveDataProvider'
    );
  }

  return context;
};
