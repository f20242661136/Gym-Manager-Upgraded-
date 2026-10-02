import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

const hasUsableConnection = (
  state: {
    isConnected?: boolean | null;
    isInternetReachable?: boolean | null;
  }
): boolean =>
  Boolean(
    state.isConnected &&
      state.isInternetReachable !== false
  );

export const useNetworkStatus = (): boolean => {
  const [isConnected, setIsConnected] =
    useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch()
      .then(state => {
        if (mounted) {
          setIsConnected(
            hasUsableConnection(state)
          );
        }
      })
      .catch(() => {
        // Keep the current state when the initial
        // reachability lookup itself fails.
      });

    const unsubscribe =
      NetInfo.addEventListener(state => {
        if (!mounted) return;

        setIsConnected(
          hasUsableConnection(state)
        );
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return isConnected;
};