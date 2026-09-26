import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { api } from '../services/api';
import { useGym } from '../contexts/GymContext';
import type {
  Client,
  Payment,
} from '../types';
import { formatMoney } from '../utils/currency';
import {
  openWhatsApp,
  renewalWhatsAppMessage,
} from '../utils/whatsapp';
import {
  EmptyState,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

type MembershipTone =
  | 'success'
  | 'warning'
  | 'danger';

const ClientDetailScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const { activeGym } = useGym();

  const clientId: string =
    route.params.clientId;

  const [client, setClient] =
    useState<Client | null>(null);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    showMeasurements,
    setShowMeasurements,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);

      const [
        clientData,
        paymentsData,
      ] = await Promise.all([
        api.getClient(clientId),
        api.getPayments(clientId),
      ]);

      setClient(clientData || null);
      setPayments(paymentsData);
    } catch (loadError) {
      console.error(
        'Member profile failed:',
        loadError
      );

      setError(
        'Member details could not be refreshed.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const membership = useMemo(() => {
    if (!client) {
      return {
        label: 'UNKNOWN',
        tone:
          'warning' as MembershipTone,
        message:
          'Membership status unavailable.',
      };
    }

    const due =
      client.membershipDueDate
        ? new Date(
            client.membershipDueDate
          )
        : null;

    const expired =
      due &&
      Number.isFinite(
        due.getTime()
      ) &&
      due.getTime() <
        Date.now();

    if (expired) {
      return {
        label: 'EXPIRED',
        tone:
          'danger' as MembershipTone,
        message:
          `Expired ${due.toLocaleDateString()}`,
      };
    }

    if (
      client.membershipStatus ===
      'Paid'
    ) {
      return {
        label: 'ACTIVE',
        tone:
          'success' as MembershipTone,
        message: due
          ? `Valid until ${due.toLocaleDateString()}`
          : 'Membership paid',
      };
    }

    return {
      label: 'NEEDS RENEWAL',
      tone:
        'warning' as MembershipTone,
      message: due
        ? `Due ${due.toLocaleDateString()}`
        : 'No active paid membership',
    };
  }, [client]);

  const rootNavigate = (
    name: string,
    params?: any
  ) => {
    const root =
      navigation
        .getParent()
        ?.getParent();

    root?.navigate(name, params);
  };

  const receiveFee = () => {
    if (!client) return;

    navigation
      .getParent()
      ?.navigate(
        'Payments',
        {
          screen: 'AddPayment',
          params: {
            clientId: client.id,
            clientName:
              client.name,
          },
        }
      );
  };

  const checkIn = () => {
    navigation
      .getParent()
      ?.navigate('Attendance');
  };

  const showCard = () => {
    if (!client) return;

    rootNavigate(
      'MemberCard',
      {
        clientId: client.id,
      }
    );
  };

  const edit = () => {
    if (!client) return;

    navigation.navigate(
      'AddClient',
      {
        client,
        isEditing: true,
      }
    );
  };

  const call = async () => {
    if (!client?.phone) {
      Alert.alert(
        'No phone number'
      );
      return;
    }

    try {
      await Linking.openURL(
        `tel:${client.phone}`
      );
    } catch {
      Alert.alert(
        'Unable to open phone dialer'
      );
    }
  };

  const whatsapp = async () => {
    if (
      !client ||
      !activeGym
    ) {
      return;
    }

    try {
      await openWhatsApp(
        client.phone,
        activeGym.countryCode,
        renewalWhatsAppMessage(
          activeGym.name,
          client.name,
          client.membershipDueDate
        )
      );
    } catch (waError: any) {
      Alert.alert(
        'Unable to open WhatsApp',
        waError?.message ||
          'Check this member’s phone number.'
      );
    }
  };

  const deleteMember = () => {
    if (!client) return;

    Alert.alert(
      'Delete member?',
      `${client.name} will be removed from this gym. This action should only be used for an incorrectly created profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteClient(
                client.id
              );

              navigation.goBack();
            } catch (deleteError: any) {
              Alert.alert(
                'Unable to delete member',
                deleteError?.message ||
                  'Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text style={styles.loadingText}>
          Loading member...
        </Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.loading}>
        <EmptyState
          icon="person-outline"
          title="Member not found"
          body="This profile may have been removed or is unavailable offline."
        />

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={load}
        >
          <Text
            style={
              styles.retryText
            }
          >
            Try again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const latestPayments =
    payments.slice(0, 6);

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={ui.color.brand}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                navigation.goBack()
              }
              style={
                styles.headerAction
              }
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit member"
              onPress={edit}
              style={
                styles.headerEdit
              }
            >
              <Ionicons
                name="create-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text
                style={
                  styles.headerEditText
                }
              >
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.identityRow
            }
          >
            {client.photoUrl ? (
              <Image
                source={{
                  uri: client.photoUrl,
                }}
                style={styles.photo}
              />
            ) : (
              <View
                style={styles.avatar}
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {client.name
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <View
              style={
                styles.identityCopy
              }
            >
              <Text
                style={styles.name}
                numberOfLines={2}
              >
                {client.name}
              </Text>

              <Text
                style={styles.phone}
              >
                {client.phone ||
                  'No phone number'}
              </Text>

              <View
                style={
                  styles.heroPills
                }
              >
                <StatusPill
                  label={
                    membership.label
                  }
                  toneName={
                    membership.tone
                  }
                />

                {client.syncState ===
                'pending' ? (
                  <StatusPill
                    label="PENDING SYNC"
                    toneName="warning"
                  />
                ) : client.syncState ===
                  'failed' ? (
                  <StatusPill
                    label="SYNC ISSUE"
                    toneName="danger"
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View
            style={
              styles.membershipStrip
            }
          >
            <Ionicons
              name={
                membership.tone ===
                'success'
                  ? 'checkmark-circle-outline'
                  : membership.tone ===
                      'danger'
                    ? 'alert-circle-outline'
                    : 'time-outline'
              }
              size={19}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.membershipStripText
              }
            >
              {membership.message}
            </Text>
          </View>
        </View>

        {error ? (
          <TouchableOpacity
            onPress={load}
            style={styles.errorBar}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={18}
              color={
                ui.color.warning
              }
            />
            <Text
              style={
                styles.errorText
              }
            >
              {error} Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionGrid}>
          <PrimaryAction
            icon="cash-outline"
            label="Receive fee"
            helper="Renew membership"
            tone="brand"
            onPress={receiveFee}
          />

          <PrimaryAction
            icon="scan-circle-outline"
            label="Check in"
            helper="Open attendance"
            tone="success"
            onPress={checkIn}
          />

          <PrimaryAction
            icon="logo-whatsapp"
            label="WhatsApp"
            helper="Send reminder"
            tone="success"
            onPress={whatsapp}
          />

          <PrimaryAction
            icon="qr-code-outline"
            label="Member card"
            helper="QR identity"
            tone="neutral"
            onPress={showCard}
          />
        </View>

        <SurfaceCard style={styles.card}>
          <SectionHeader
            title="Contact"
            subtitle="Fast communication from reception."
          />

          <ContactRow
            icon="call-outline"
            label="Phone"
            value={
              client.phone ||
              'Not added'
            }
            action="Call"
            onPress={call}
          />

          <ContactRow
            icon="mail-outline"
            label="Email"
            value={
              client.email ||
              'Not added'
            }
          />

          <ContactRow
            icon="calendar-outline"
            label="Joined"
            value={new Date(
              client.registrationDate
            ).toLocaleDateString()}
            last
          />
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <SectionHeader
            title="Membership"
            subtitle="Current front-desk status"
          />

          <View
            style={
              styles.membershipSummary
            }
          >
            <View>
              <Text
                style={
                  styles.summaryLabel
                }
              >
                STATUS
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {membership.label}
              </Text>
            </View>

            <View
              style={
                styles.summaryRight
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                DUE DATE
              </Text>

              <Text
                style={
                  styles.summaryDate
                }
              >
                {client.membershipDueDate
                  ? new Date(
                      client.membershipDueDate
                    ).toLocaleDateString()
                  : 'Not set'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={receiveFee}
            style={
              styles.renewButton
            }
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={ui.color.brand}
            />

            <Text
              style={
                styles.renewText
              }
            >
              Receive membership fee
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                ui.color.textMuted
              }
            />
          </TouchableOpacity>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <SectionHeader
            title="Recent payments"
            subtitle={
              payments.length
                ? `${payments.length} payment record${payments.length === 1 ? '' : 's'}`
                : 'No payment history yet'
            }
            actionLabel={
              payments.length
                ? 'View payments'
                : undefined
            }
            onAction={
              payments.length
                ? () =>
                    navigation
                      .getParent()
                      ?.navigate(
                        'Payments',
                        {
                          screen:
                            'PaymentsList',
                          params: {
                            clientId:
                              client.id,
                            clientName:
                              client.name,
                          },
                        }
                      )
                : undefined
            }
          />

          {latestPayments.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No payments yet"
              body="Use Receive fee to record this member’s first membership payment."
            />
          ) : (
            latestPayments.map(
              (payment, index) => (
                <TouchableOpacity
                  key={payment.id}
                  activeOpacity={0.75}
                  onPress={() =>
                    rootNavigate(
                      'Receipt',
                      {
                        paymentId:
                          payment.id,
                      }
                    )
                  }
                  style={[
                    styles.paymentRow,
                    index > 0 &&
                      styles.rowBorder,
                  ]}
                >
                  <View
                    style={
                      styles.paymentIcon
                    }
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={
                        ui.color.brand
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.paymentCopy
                    }
                  >
                    <Text
                      style={
                        styles.paymentAmount
                      }
                    >
                      {formatMoney(
                        payment.amount,
                        activeGym
                          ?.currencyCode ||
                          'PKR'
                      )}
                    </Text>

                    <Text
                      style={
                        styles.paymentMeta
                      }
                    >
                      {new Date(
                        payment.paymentDate
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <StatusPill
                    label={payment.status}
                    toneName={
                      payment.status ===
                      'Paid'
                        ? 'success'
                        : payment.status ===
                            'Voided'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </TouchableOpacity>
              )
            )
          )}
        </SurfaceCard>

        <TouchableOpacity
          onPress={() =>
            setShowMeasurements(
              value => !value
            )
          }
          style={styles.disclosure}
        >
          <View
            style={
              styles.disclosureIcon
            }
          >
            <Ionicons
              name="fitness-outline"
              size={19}
              color={ui.color.brand}
            />
          </View>

          <View
            style={
              styles.disclosureCopy
            }
          >
            <Text
              style={
                styles.disclosureTitle
              }
            >
              Profile details
            </Text>
            <Text
              style={
                styles.disclosureSubtitle
              }
            >
              Age, gender and body
              measurements
            </Text>
          </View>

          <Ionicons
            name={
              showMeasurements
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={20}
            color={ui.color.textMuted}
          />
        </TouchableOpacity>

        {showMeasurements ? (
          <SurfaceCard
            style={styles.card}
          >
            <View
              style={
                styles.profileGrid
              }
            >
              <ProfileMetric
                label="Age"
                value={
                  client.age
                    ? `${client.age}`
                    : '-'
                }
              />
              <ProfileMetric
                label="Gender"
                value={
                  client.gender || '-'
                }
              />
              <ProfileMetric
                label="Weight"
                value={
                  client.weight
                    ? `${client.weight} kg`
                    : '-'
                }
              />
              <ProfileMetric
                label="Height"
                value={
                  client.height
                    ? `${client.height} cm`
                    : '-'
                }
              />
              <ProfileMetric
                label="BMI"
                value={
                  client.bmi
                    ? Number(
                        client.bmi
                      ).toFixed(1)
                    : '-'
                }
              />
              <ProfileMetric
                label="Chest"
                value={
                  client.chest
                    ? `${client.chest} cm`
                    : '-'
                }
              />
              <ProfileMetric
                label="Waist"
                value={
                  client.waist
                    ? `${client.waist} cm`
                    : '-'
                }
              />
            </View>
          </SurfaceCard>
        ) : null}

        <View style={styles.dangerZone}>
          <Text
            style={
              styles.dangerLabel
            }
          >
            PROFILE MANAGEMENT
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={deleteMember}
            style={
              styles.deleteButton
            }
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={ui.color.danger}
            />

            <View
              style={
                styles.deleteCopy
              }
            >
              <Text
                style={
                  styles.deleteTitle
                }
              >
                Delete member
              </Text>
              <Text
                style={
                  styles.deleteSubtitle
                }
              >
                Use only for an
                incorrectly created
                profile.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const PrimaryAction = ({
  icon,
  label,
  helper,
  tone,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  helper: string;
  tone:
    | 'brand'
    | 'success'
    | 'neutral';
  onPress: () => void;
}) => {
  const colors =
    tone === 'success'
      ? {
          bg:
            ui.color.successSoft,
          fg:
            ui.color.success,
        }
      : tone === 'neutral'
        ? {
            bg:
              ui.color.surfaceSubtle,
            fg:
              ui.color.textSecondary,
          }
        : {
            bg:
              ui.color.brandSoft,
            fg:
              ui.color.brand,
          };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.78}
      onPress={onPress}
      style={styles.primaryAction}
    >
      <View
        style={[
          styles.primaryActionIcon,
          {
            backgroundColor:
              colors.bg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.fg}
        />
      </View>

      <Text
        style={
          styles.primaryActionLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.primaryActionHelper
        }
      >
        {helper}
      </Text>
    </TouchableOpacity>
  );
};

const ContactRow = ({
  icon,
  label,
  value,
  action,
  onPress,
  last = false,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  action?: string;
  onPress?: () => void;
  last?: boolean;
}) => (
  <View
    style={[
      styles.contactRow,
      !last &&
        styles.rowBorder,
    ]}
  >
    <View
      style={styles.contactIcon}
    >
      <Ionicons
        name={icon}
        size={17}
        color={ui.color.textMuted}
      />
    </View>

    <View
      style={
        styles.contactCopy
      }
    >
      <Text
        style={
          styles.contactLabel
        }
      >
        {label}
      </Text>
      <Text
        style={
          styles.contactValue
        }
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>

    {action && onPress ? (
      <TouchableOpacity
        onPress={onPress}
        style={styles.inlineAction}
      >
        <Text
          style={
            styles.inlineActionText
          }
        >
          {action}
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const ProfileMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.profileMetric}>
    <Text
      style={
        styles.profileMetricLabel
      }
    >
      {label}
    </Text>
    <Text
      style={
        styles.profileMetricValue
      }
    >
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
    paddingBottom: 46,
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

  retryButton: {
    minHeight: ui.touch.min,
    borderRadius: ui.radius.md,
    backgroundColor: ui.color.brand,
    paddingHorizontal: ui.space.xl,
    justifyContent: 'center',
    marginTop: ui.space.md,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  hero: {
    backgroundColor:
      ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    marginBottom: ui.space.md,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerAction: {
    width: ui.touch.min,
    height: ui.touch.min,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerEdit: {
    minHeight: 40,
    borderRadius: ui.radius.md,
    paddingHorizontal: 11,
    backgroundColor:
      'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  headerEditText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ui.space.md,
  },

  avatar: {
    width: 74,
    height: 74,
    borderRadius: 23,
    backgroundColor:
      'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
  },

  photo: {
    width: 74,
    height: 74,
    borderRadius: 23,
    marginRight: ui.space.md,
  },

  identityCopy: {
    flex: 1,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  phone: {
    color: '#E0E7FF',
    fontSize: 11,
    marginTop: 4,
  },

  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },

  membershipStrip: {
    minHeight: 44,
    borderRadius: ui.radius.md,
    backgroundColor:
      'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
    paddingHorizontal: ui.space.md,
    marginTop: ui.space.lg,
  },

  membershipStripText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  errorBar: {
    minHeight: ui.touch.min,
    backgroundColor:
      ui.color.warningSoft,
    borderWidth: 1,
    borderColor:
      ui.color.warningBorder,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
    marginBottom: ui.space.md,
  },

  errorText: {
    flex: 1,
    color: ui.color.warning,
    fontSize: 10,
    fontWeight: '800',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
    marginBottom: ui.space.md,
  },

  primaryAction: {
    width: '48.5%',
    minHeight: 112,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    justifyContent: 'center',
  },

  primaryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.sm,
  },

  primaryActionLabel: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  primaryActionHelper: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  card: {
    padding: ui.space.lg,
    marginBottom: ui.space.md,
  },

  contactRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
  },

  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor:
      ui.color.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  contactCopy: {
    flex: 1,
  },

  contactLabel: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  contactValue: {
    color: ui.color.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  inlineAction: {
    minHeight: ui.touch.min,
    minWidth: ui.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineActionText: {
    color: ui.color.brand,
    fontSize: 10,
    fontWeight: '900',
  },

  membershipSummary: {
    backgroundColor:
      ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  summaryLabel: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  summaryValue: {
    color: ui.color.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },

  summaryRight: {
    alignItems: 'flex-end',
  },

  summaryDate: {
    color: ui.color.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  renewButton: {
    minHeight: 51,
    borderRadius: ui.radius.md,
    backgroundColor:
      ui.color.brandSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
    paddingHorizontal: ui.space.md,
    marginTop: ui.space.md,
  },

  renewText: {
    flex: 1,
    color: ui.color.brand,
    fontSize: 11,
    fontWeight: '900',
  },

  paymentRow: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  paymentCopy: {
    flex: 1,
  },

  paymentAmount: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  paymentMeta: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  disclosure: {
    minHeight: 64,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ui.space.md,
  },

  disclosureIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor:
      ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  disclosureCopy: {
    flex: 1,
  },

  disclosureTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  disclosureSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
  },

  profileMetric: {
    width: '47%',
    backgroundColor:
      ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
  },

  profileMetricLabel: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  profileMetricValue: {
    color: ui.color.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },

  dangerZone: {
    marginTop: ui.space.sm,
  },

  dangerLabel: {
    color: ui.color.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: ui.space.sm,
  },

  deleteButton: {
    minHeight: 68,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor:
      ui.color.dangerBorder,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
  },

  deleteCopy: {
    flex: 1,
  },

  deleteTitle: {
    color: ui.color.danger,
    fontSize: 11,
    fontWeight: '900',
  },

  deleteSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },
});

export default ClientDetailScreen;