import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Client } from '../types';
import { StatusPill } from '../ui/components';
import { ui, shadow } from '../ui/theme';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

const ClientCard:
  React.FC<ClientCardProps> = ({
    client,
    onPress,
  }) => {
  const paid =
    client.membershipStatus === 'Paid';

  const dueText =
    client.membershipDueDate
      ? `Due ${new Date(
          client.membershipDueDate
        ).toLocaleDateString()}`
      : 'No due date';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${client.name}`}
      activeOpacity={0.76}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {client.name
            .slice(0, 1)
            .toUpperCase()}
        </Text>
      </View>

      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {client.name}
          </Text>

          {client.syncState === 'pending' ? (
            <StatusPill
              label="PENDING SYNC"
              toneName="warning"
            />
          ) : client.syncState === 'failed' ? (
            <StatusPill
              label="SYNC ISSUE"
              toneName="danger"
            />
          ) : null}
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="call-outline"
            size={14}
            color={ui.color.textMuted}
          />
          <Text
            style={styles.detailText}
            numberOfLines={1}
          >
            {client.phone ||
              'No phone number'}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <StatusPill
            label={
              paid
                ? 'ACTIVE / PAID'
                : 'FOLLOW UP'
            }
            toneName={
              paid
                ? 'success'
                : 'warning'
            }
          />

          <Text style={styles.dueText}>
            {dueText}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={ui.color.textMuted}
      />
    </TouchableOpacity>
  );
};

const styles = createAdaptiveStyles({
  card: {
    minHeight: 94,
    backgroundColor: ui.color.surface,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.color.border,
    padding: ui.space.md,
    marginHorizontal: ui.space.lg,
    marginVertical: ui.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  avatarText: {
    color: ui.color.brand,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    paddingRight: ui.space.sm,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ui.space.xs,
  },
  name: {
    flexShrink: 1,
    color: ui.color.text,
    fontSize: 14,
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.xs,
    marginTop: ui.space.xs,
  },
  detailText: {
    flex: 1,
    color: ui.color.textSecondary,
    fontSize: 10,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.space.sm,
    marginTop: ui.space.sm,
  },
  dueText: {
    flex: 1,
    textAlign: 'right',
    color: ui.color.textMuted,
    fontSize: 9,
  },
});

export default ClientCard;