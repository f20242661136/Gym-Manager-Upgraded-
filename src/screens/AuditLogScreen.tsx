import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../contexts/GymContext';
import { staffService } from '../services/staffService';
import type { AuditLogEntry } from '../types/gym';

const actionLabels: Record<string, string> = {
  'staff.invitation_created': 'Staff invitation created',
  'staff.invitation_accepted': 'Staff invitation accepted',
  'staff.invitation_revoked': 'Staff invitation revoked',
  'staff.role_changed': 'Staff role changed',
  'staff.deactivated': 'Staff access deactivated',
  'payment.voided': 'Payment voided',
};

const AuditLogScreen: React.FC = () => {
  const { activeGymId, activeGym } = useGym();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeGymId) return;

    try {
      const rows = await staffService.listAuditLogs(activeGymId, 150);
      setLogs(rows);
    } catch (error: any) {
      Alert.alert(
        'Unable to load activity',
        error?.message || 'Please try again.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeGymId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={logs}
      keyExtractor={item => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.hero}>
          <View style={styles.icon}>
            <Ionicons name="time-outline" size={25} color="#4F46E5" />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{activeGym?.name}</Text>
            <Text style={styles.title}>Activity log</Text>
            <Text style={styles.subtitle}>
              Important staff and financial actions are recorded for accountability.
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>
            New security-sensitive actions will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.logRow}>
          <View style={styles.dot} />

          <View style={styles.logBody}>
            <Text style={styles.logTitle}>
              {actionLabels[item.action] ?? item.action}
            </Text>

            <Text style={styles.logMeta}>
              {item.actorEmail || 'System / user'}
            </Text>

            <Text style={styles.logTime}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    />
  );
};

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
  },
  hero: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    flexDirection: 'row',
    marginBottom: 16,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: ui.color.brand,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: ui.color.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: ui.color.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  logRow: {
    flexDirection: 'row',
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: 15,
    padding: 15,
    marginBottom: 9,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: ui.color.brand,
    marginTop: 5,
    marginRight: 12,
  },
  logBody: {
    flex: 1,
  },
  logTitle: {
    color: ui.color.text,
    fontSize: 14,
    fontWeight: '800',
  },
  logMeta: {
    color: ui.color.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  logTime: {
    color: ui.color.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 46,
  },
  emptyTitle: {
    color: ui.color.textSecondary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: ui.color.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});

export default AuditLogScreen;