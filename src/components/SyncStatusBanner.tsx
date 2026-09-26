import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '../contexts/SyncContext';

export const SyncStatusBanner:
  React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    state,
    queue,
    isConnected,
    retryFailed,
  } = useSync();

  if (
    state === 'idle' &&
    queue.total === 0
  ) {
    return null;
  }

  let label = '';

  if (!isConnected) {
    label =
      queue.total > 0
        ? `Offline  -  ${queue.total} pending`
        : 'Offline';
  } else if (state === 'syncing') {
    label = `Syncing  -  ${Math.max(
      queue.pending +
        queue.processing,
      1
    )}`;
  } else if (queue.failed > 0) {
    label =
      `${queue.failed} sync issue` +
      (queue.failed === 1
        ? ''
        : 's') +
      '  -  tap to retry';
  } else if (queue.pending > 0) {
    label =
      `${queue.pending} pending`;
  }

  if (!label) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={
        !isConnected ||
        queue.failed === 0
      }
      onPress={() =>
        retryFailed().catch(() => {})
      }
      style={[
        styles.pill,
        {
          top:
            insets.top + 7,
        },
        !isConnected &&
          styles.offline,
        queue.failed > 0 &&
          styles.failed,
      ]}
    >
      <Text style={styles.text}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = createAdaptiveStyles({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    elevation: 12,
    backgroundColor: ui.color.brandStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  offline: {
    backgroundColor: ui.color.textSecondary,
  },
  failed: {
    backgroundColor: ui.color.danger,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});