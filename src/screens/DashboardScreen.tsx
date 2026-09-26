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
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { api } from '../services/api';
import { useGym } from '../contexts/GymContext';
import type {
  DashboardStats,
  Client,
  Payment,
} from '../types';
import {
  EmptyState,
  MetricCard,
  QuickAction,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { activeGym } = useGym();
  const { width, fontScale } = useWindowDimensions();
  const compactMetrics = width < 390 || fontScale >= 1.25;

  const [stats, setStats] =
    useState<DashboardStats>({
      totalClients: 0,
      paidClients: 0,
      unpaidClients: 0,
    });

  const [recentClients, setRecentClients] =
    useState<Client[]>([]);

  const [recentPayments, setRecentPayments] =
    useState<Payment[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);

      const [
        dashboardStats,
        clients,
        payments,
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentClients(),
        api.getRecentPayments(),
      ]);

      setStats(dashboardStats);
      setRecentClients(clients);
      setRecentPayments(payments);
    } catch (loadError) {
      console.error(
        'Dashboard load failed:',
        loadError
      );

      setError(
        'Some dashboard data could not be refreshed.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completion = useMemo(() => {
    if (stats.totalClients <= 0) {
      return 0;
    }

    return Math.round(
      (stats.paidClients /
        stats.totalClients) *
        100
    );
  }, [
    stats.paidClients,
    stats.totalClients,
  ]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text style={styles.loadingText}>
          Preparing today's overview...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
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
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>
              {activeGym?.name || 'YOUR GYM'}
            </Text>

            <Text style={styles.heroTitle}>
              Today at a glance
            </Text>

            <Text style={styles.heroSubtitle}>
              Members, collections and front-desk actions without digging through reports.
            </Text>
          </View>

          <View style={styles.heroMark}>
            <Ionicons
              name="pulse-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.healthRow}>
          <View style={styles.healthMain}>
            <Text style={styles.healthValue}>
              {completion}%
            </Text>
            <Text style={styles.healthLabel}>
              members up to date
            </Text>
          </View>

          <StatusPill
            label={
              stats.unpaidClients > 0
                ? `${stats.unpaidClients} NEED ATTENTION`
                : 'ALL CLEAR'
            }
            toneName={
              stats.unpaidClients > 0
                ? 'warning'
                : 'success'
            }
          />
        </View>
      </View>

      {error ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={load}
          style={styles.errorBar}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={18}
            color={ui.color.warning}
          />
          <Text style={styles.errorText}>
            {error} Tap to retry.
          </Text>
        </TouchableOpacity>
      ) : null}

      <View
        style={[
          styles.metricGrid,
          compactMetrics && styles.metricGridCompact,
        ]}
      >
        <MetricCard
          icon="people-outline"
          label="Members"
          value={stats.totalClients}
          helper="Total profiles"
          toneName="brand"
        />

        <MetricCard
          icon="checkmark-circle-outline"
          label="Up to date"
          value={stats.paidClients}
          helper="Membership paid"
          toneName="success"
        />

        <MetricCard
          icon="alert-circle-outline"
          label="Attention"
          value={stats.unpaidClients}
          helper="Follow up"
          toneName={
            stats.unpaidClients > 0
              ? 'warning'
              : 'neutral'
          }
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Quick actions"
          subtitle="The front-desk tasks that should never take more than a couple of taps."
        />

        <View style={styles.quickActionGrid}>
          <QuickAction
            icon="person-add-outline"
            label="Add member"
            helper="Create a profile"
            toneName="brand"
            onPress={() =>
              navigation.navigate(
                'Clients',
                { screen: 'AddClient' }
              )
            }
          />

          <QuickAction
            icon="scan-circle-outline"
            label="Check in"
            helper="Manual or QR"
            toneName="success"
            onPress={() =>
              navigation.navigate(
                'Attendance'
              )
            }
          />

          <QuickAction
            icon="cash-outline"
            label="Receive fee"
            helper="Membership payment"
            toneName="warning"
            onPress={() =>
              navigation.navigate(
                'Clients',
                { screen: 'ClientsList' }
              )
            }
          />

          <QuickAction
            icon="logo-whatsapp"
            label="Message member"
            helper="Reminder or welcome"
            toneName="success"
            onPress={() =>
              navigation
                .getParent()
                ?.navigate('WhatsAppTools')
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="New members"
          subtitle="Recent registrations"
          actionLabel="View all"
          onAction={() =>
            navigation.navigate('Clients')
          }
        />

        <SurfaceCard>
          {recentClients.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No recent members"
              body="New registrations will appear here."
            />
          ) : (
            recentClients
              .slice(0, 4)
              .map((client, index) => (
                <TouchableOpacity
                  key={client.id}
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  style={[
                    styles.activityRow,
                    index > 0 &&
                      styles.activityBorder,
                  ]}
                  onPress={() =>
                    navigation.navigate(
                      'Clients',
                      {
                        screen: 'ClientDetail',
                        params: {
                          clientId: client.id,
                        },
                      }
                    )
                  }
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {client.name
                        .slice(0, 1)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.activityCopy}>
                    <Text
                      style={styles.activityTitle}
                      numberOfLines={1}
                    >
                      {client.name}
                    </Text>

                    <Text style={styles.activityMeta}>
                      Joined{' '}
                      {new Date(
                        client.registrationDate
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <StatusPill
                    label={
                      client.membershipStatus ===
                      'Paid'
                        ? 'PAID'
                        : 'FOLLOW UP'
                    }
                    toneName={
                      client.membershipStatus ===
                      'Paid'
                        ? 'success'
                        : 'warning'
                    }
                  />
                </TouchableOpacity>
              ))
          )}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent payments"
          subtitle="Latest collection activity"
          actionLabel="View all"
          onAction={() =>
            navigation.navigate('Payments')
          }
        />

        <SurfaceCard>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No recent payments"
              body="Confirmed member payments will appear here."
            />
          ) : (
            recentPayments
              .slice(0, 4)
              .map((payment, index) => (
                <TouchableOpacity
                  key={payment.id}
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  style={[
                    styles.activityRow,
                    index > 0 &&
                      styles.activityBorder,
                  ]}
                  onPress={() =>
                    navigation.navigate(
                      'Payments',
                      {
                        screen: 'PaymentsList',
                        params: {
                          clientId:
                            payment.clientId,
                          clientName:
                            payment.clientName,
                        },
                      }
                    )
                  }
                >
                  <View
                    style={[
                      styles.activityIcon,
                      styles.paymentIcon,
                    ]}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={ui.color.brand}
                    />
                  </View>

                  <View style={styles.activityCopy}>
                    <Text
                      style={styles.activityTitle}
                      numberOfLines={1}
                    >
                      {payment.clientName}
                    </Text>

                    <Text style={styles.activityMeta}>
                      {new Date(
                        payment.paymentDate
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={ui.color.textMuted}
                  />
                </TouchableOpacity>
              ))
          )}
        </SurfaceCard>
      </View>
    </ScrollView>
  );
};

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: ui.space.lg,
    paddingBottom: 42,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
  },
  loadingText: {
    color: ui.color.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: ui.space.md,
  },
  hero: {
    backgroundColor: ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    marginBottom: ui.space.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    paddingRight: ui.space.md,
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: ui.type.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: ui.type.page,
    fontWeight: '900',
    marginTop: ui.space.xxs,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: ui.type.bodySm,
    lineHeight: 17,
    marginTop: ui.space.xs,
    maxWidth: 270,
  },
  heroMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: ui.space.xl,
  },
  healthMain: {
    flex: 1,
  },
  healthValue: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
  },
  healthLabel: {
    color: '#C7D2FE',
    fontSize: 10,
    marginTop: 2,
  },
  errorBar: {
    minHeight: ui.touch.min,
    backgroundColor: ui.color.warningSoft,
    borderWidth: 1,
    borderColor: ui.color.warningBorder,
    borderRadius: ui.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
    paddingHorizontal: ui.space.md,
    marginBottom: ui.space.md,
  },
  errorText: {
    flex: 1,
    color: ui.color.warning,
    fontSize: 10,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: ui.space.sm,
    marginBottom: ui.space.xl,
  },

  metricGridCompact: {
    flexDirection: 'column',
  },
  section: {
    marginBottom: ui.space.xl,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
  },
  activityRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ui.space.md,
    paddingVertical: ui.space.sm,
  },
  activityBorder: {
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  avatarText: {
    color: ui.color.brand,
    fontSize: 15,
    fontWeight: '900',
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  paymentIcon: {
    backgroundColor: ui.color.brandSoft,
  },
  activityCopy: {
    flex: 1,
    paddingRight: ui.space.sm,
  },
  activityTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  activityMeta: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },
});

export default DashboardScreen;