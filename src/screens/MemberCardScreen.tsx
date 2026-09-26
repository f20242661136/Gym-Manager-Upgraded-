import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

import { useGym } from '../contexts/GymContext';
import { attendanceService } from '../services/attendanceService';
import type {
  AttendanceMember,
} from '../types/attendance';
import {
  StatusPill,
} from '../ui/components';
import { ui } from '../ui/theme';

const MemberCardScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const {
    activeGym,
    activeGymId,
  } = useGym();

  const params =
    route.params || {};

  const clientId: string =
    params.clientId;

  const [
    member,
    setMember,
  ] = useState<
    AttendanceMember | null
  >(
    params.qrToken
      ? {
          id: clientId,
          name: params.name || '',
          phone:
            params.phone || null,
          photoUrl:
            params.photoUrl || null,
          qrToken:
            params.qrToken,
          membershipDueDate:
            params.membershipDueDate ||
            null,
          membershipStatus:
            params.membershipStatus ||
            'inactive',
          canCheckIn:
            params.membershipStatus ===
            'active',
          isCheckedIn: false,
        }
      : null
  );

  const [loading, setLoading] =
    useState(!member);

  useEffect(() => {
    if (
      member ||
      !activeGymId ||
      !clientId
    ) {
      return;
    }

    attendanceService
      .searchMembers(
        activeGymId,
        clientId
      )
      .then(rows => {
        const exact =
          rows.find(
            item =>
              item.id === clientId
          ) || null;

        setMember(exact);
      })
      .catch(error => {
        console.error(
          'Member card load failed:',
          error
        );
      })
      .finally(() =>
        setLoading(false)
      );
  }, [
    activeGymId,
    clientId,
    member,
  ]);

  const status = useMemo(() => {
    if (!member) {
      return {
        label: 'UNAVAILABLE',
        tone: 'neutral' as const,
      };
    }

    if (
      member.membershipStatus ===
      'active'
    ) {
      return {
        label: 'ACTIVE',
        tone: 'success' as const,
      };
    }

    if (
      member.membershipStatus ===
      'frozen'
    ) {
      return {
        label: 'FROZEN',
        tone: 'warning' as const,
      };
    }

    if (
      member.membershipStatus ===
      'expired'
    ) {
      return {
        label: 'EXPIRED',
        tone: 'danger' as const,
      };
    }

    return {
      label: 'NO ACTIVE PLAN',
      tone: 'neutral' as const,
    };
  }, [member]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text
          style={styles.loadingText}
        >
          Loading member card...
        </Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.loading}>
        <Ionicons
          name="qr-code-outline"
          size={40}
          color={ui.color.textMuted}
        />
        <Text style={styles.errorTitle}>
          Member card unavailable
        </Text>
        <Text style={styles.errorText}>
          Reconnect and open this member
          again.
        </Text>
      </View>
    );
  }

  const qrValue =
    `gymapp:member:${member.qrToken}`;

  const shareCard = async () => {
    try {
      await Share.share({
        message: [
          `${activeGym?.name || 'Gym'} member card`,
          member.name,
          member.phone || null,
          `Member code: ${member.qrToken
            .slice(0, 8)
            .toUpperCase()}`,
          'Open the app and show the QR at reception for check-in.',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error: any) {
      Alert.alert(
        'Unable to share',
        error?.message ||
          'Please try again.'
      );
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              navigation.goBack()
            }
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.brandCopy}>
            <Text style={styles.gymName}>
              {activeGym?.name ||
                'Gym Member'}
            </Text>
            <Text
              style={styles.cardLabel}
            >
              DIGITAL MEMBER CARD
            </Text>
          </View>

          <StatusPill
            label={status.label}
            toneName={status.tone}
          />
        </View>

        <View style={styles.identity}>
          {member.photoUrl ? (
            <Image
              source={{
                uri: member.photoUrl,
              }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={
                styles.avatarFallback
              }
            >
              <Text
                style={
                  styles.avatarLetter
                }
              >
                {member.name
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
            </View>
          )}

          <View
            style={styles.memberCopy}
          >
            <Text
              style={styles.memberName}
            >
              {member.name}
            </Text>

            <Text
              style={
                styles.memberPhone
              }
            >
              {member.phone ||
                'No phone'}
            </Text>

            <Text
              style={
                styles.memberCode
              }
            >
              ID{' '}
              {member.qrToken
                .slice(0, 8)
                .toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.qrPanel}>
          <View style={styles.qrBox}>
            <QRCode
              value={qrValue}
              size={215}
              backgroundColor="#FFFFFF"
            />
          </View>

          <Text style={styles.scanTitle}>
            Show this at reception
          </Text>

          <Text style={styles.scanText}>
            The QR stores an anonymous
            member token. It does not
            contain the member name,
            phone number or payment
            details.
          </Text>
        </View>

        <View style={styles.details}>
          <Detail
            label="Membership"
            value={status.label}
          />

          <Detail
            label="Valid until"
            value={
              member.membershipDueDate
                ? new Date(
                    member.membershipDueDate
                  ).toLocaleDateString()
                : '-'
            }
          />
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={shareCard}
        style={styles.shareButton}
      >
        <Ionicons
          name="share-social-outline"
          size={19}
          color={ui.color.brand}
        />
        <Text style={styles.shareText}>
          Share member details
        </Text>
      </TouchableOpacity>

      <View style={styles.securityNote}>
        <Ionicons
          name="shield-checkmark-outline"
          size={19}
          color={ui.color.success}
        />
        <Text
          style={
            styles.securityText
          }
        >
          Staff should visually confirm
          the member when needed because
          a screenshot of a QR can still
          identify this member at the
          same gym.
        </Text>
      </View>
    </ScrollView>
  );
};

const Detail = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>
      {label}
    </Text>
    <Text style={styles.detailValue}>
      {value}
    </Text>
  </View>
);

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: ui.space.lg,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
    padding: ui.space.xl,
  },
  loadingText: {
    color: ui.color.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: ui.space.md,
  },
  errorTitle: {
    color: ui.color.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: ui.space.md,
  },
  errorText: {
    color: ui.color.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
  card: {
    backgroundColor: ui.color.surface,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: ui.color.border,
    overflow: 'hidden',
  },
  header: {
    minHeight: 79,
    backgroundColor: ui.color.brandStrong,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  brandCopy: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cardLabel: {
    color: '#C7D2FE',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 3,
  },
  identity: {
    padding: ui.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: ui.color.border,
    marginRight: ui.space.md,
  },
  avatarFallback: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  avatarLetter: {
    color: ui.color.brand,
    fontSize: 25,
    fontWeight: '900',
  },
  memberCopy: {
    flex: 1,
  },
  memberName: {
    color: ui.color.text,
    fontSize: 20,
    fontWeight: '900',
  },
  memberPhone: {
    color: ui.color.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  memberCode: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 7,
  },
  qrPanel: {
    alignItems: 'center',
    backgroundColor: ui.color.surfaceSubtle,
    paddingVertical: 25,
    paddingHorizontal: ui.space.lg,
  },
  qrBox: {
    padding: 13,
    backgroundColor: ui.color.surface,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.color.border,
  },
  scanTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: ui.space.md,
  },
  scanText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    maxWidth: 285,
    marginTop: 4,
  },
  details: {
    paddingHorizontal: ui.space.lg,
    paddingBottom: ui.space.md,
  },
  detailRow: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: ui.color.textSecondary,
    fontSize: 10,
  },
  detailValue: {
    color: ui.color.text,
    fontSize: 10,
    fontWeight: '900',
  },
  shareButton: {
    minHeight: 52,
    marginTop: ui.space.md,
    backgroundColor: ui.color.brandSoft,
    borderRadius: ui.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ui.space.sm,
  },
  shareText: {
    color: ui.color.brand,
    fontSize: 11,
    fontWeight: '900',
  },
  securityNote: {
    marginTop: ui.space.md,
    backgroundColor: ui.color.successSoft,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
  },
  securityText: {
    flex: 1,
    color: ui.color.success,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '700',
  },
});

export default MemberCardScreen;