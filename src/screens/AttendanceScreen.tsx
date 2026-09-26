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
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  AccessibilityInfo,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { attendanceService } from '../services/attendanceService';
import type {
  AttendanceMember,
  AttendanceSummary,
  AttendanceVisit,
} from '../types/attendance';
import {
  EmptyState,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

type DeskMode = 'checkin' | 'inside';

const EMPTY_SUMMARY: AttendanceSummary = {
  todayCount: 0,
  insideCount: 0,
  uniqueMembers: 0,
  peakHour: null,
  timezone: 'Asia/Karachi',
};

const formatHour = (
  hour?: number | null
) => {
  if (
    hour === null ||
    hour === undefined
  ) {
    return '-';
  }

  const suffix =
    hour >= 12 ? 'PM' : 'AM';

  return `${hour % 12 || 12}:00 ${suffix}`;
};

const memberStatus = (
  member: AttendanceMember
) => {
  if (member.isCheckedIn) {
    return {
      label: 'INSIDE',
      tone: 'success' as const,
      action: 'Inside',
    };
  }

  if (
    member.membershipStatus ===
    'active'
  ) {
    return {
      label: 'ACTIVE',
      tone: 'success' as const,
      action: 'Check in',
    };
  }

  if (
    member.membershipStatus ===
    'frozen'
  ) {
    return {
      label: 'FROZEN',
      tone: 'warning' as const,
      action: 'Frozen',
    };
  }

  if (
    member.membershipStatus ===
    'expired'
  ) {
    return {
      label: 'EXPIRED',
      tone: 'danger' as const,
      action: 'Renew',
    };
  }

  return {
    label: 'NO ACTIVE PLAN',
    tone: 'neutral' as const,
    action: 'Renew',
  };
};

const AttendanceScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const {
    activeGym,
    activeGymId,
  } = useGym();

  const isConnected =
    useNetworkStatus();

  const [mode, setMode] =
    useState<DeskMode>('checkin');

  const [summary, setSummary] =
    useState<AttendanceSummary>(
      EMPTY_SUMMARY
    );

  const [today, setToday] =
    useState<AttendanceVisit[]>([]);

  const [members, setMembers] =
    useState<AttendanceMember[]>([]);

  const [query, setQuery] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    busyMemberId,
    setBusyMemberId,
  ] = useState<string | null>(null);

  const [
    busyVisitId,
    setBusyVisitId,
  ] = useState<string | null>(null);

  const [notice, setNotice] =
    useState<{
      tone:
        | 'success'
        | 'warning'
        | 'danger';
      title: string;
      detail: string;
    } | null>(null);

  const loadDesk =
    useCallback(async () => {
      if (
        !activeGymId ||
        !isConnected
      ) {
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const [
          summaryData,
          todayData,
        ] = await Promise.all([
          attendanceService.getSummary(
            activeGymId
          ),
          attendanceService.listToday(
            activeGymId
          ),
        ]);

        setSummary(summaryData);
        setToday(todayData);
      } catch (error: any) {
        console.error(
          'Attendance load failed:',
          error
        );

        setNotice({
          tone: 'danger',
          title:
            'Attendance unavailable',
          detail:
            error?.message ||
            'Could not refresh attendance.',
        });
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    }, [
      activeGymId,
      isConnected,
    ]);

  const searchMembers =
    useCallback(
      async (value: string) => {
        if (
          !activeGymId ||
          !isConnected
        ) {
          setSearching(false);
          return;
        }

        try {
          setSearching(true);

          const result =
            await attendanceService.searchMembers(
              activeGymId,
              value
            );

          setMembers(result);
        } catch (error) {
          console.error(
            'Attendance member search failed:',
            error
          );
        } finally {
          setSearching(false);
        }
      },
      [
        activeGymId,
        isConnected,
      ]
    );

  useEffect(() => {
    loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const timer = setTimeout(
      () => {
        searchMembers(query);
      },
      220
    );

    return () =>
      clearTimeout(timer);
  }, [
    isConnected,
    query,
    searchMembers,
  ]);

  const currentlyInside =
    useMemo(
      () =>
        today.filter(
          item => !item.checkOutAt
        ),
      [today]
    );

  const showSuccess = (
    title: string,
    detail: string
  ) => {
    setNotice({
      tone: 'success',
      title,
      detail,
    });

    Vibration.vibrate(45);

    AccessibilityInfo
      .announceForAccessibility(
        `${title}. ${detail}`
      );
  };

  const checkIn = async (
    member: AttendanceMember
  ) => {
    if (!isConnected) {
      setNotice({
        tone: 'warning',
        title: 'You are offline',
        detail:
          'Check-in requires a live connection so membership can be validated.',
      });
      return;
    }

    if (!activeGymId) {
      return;
    }

    const state =
      memberStatus(member);

    if (
      state.action === 'Renew'
    ) {
      navigation.navigate(
        'Payments',
        {
          screen: 'AddPayment',
          params: {
            clientId: member.id,
            clientName:
              member.name,
          },
        }
      );
      return;
    }

    if (
      !member.canCheckIn ||
      member.isCheckedIn
    ) {
      return;
    }

    try {
      setBusyMemberId(member.id);

      const result =
        await attendanceService.checkIn(
          activeGymId,
          member.id
        );

      if (result.duplicate) {
        setNotice({
          tone: 'warning',
          title: member.name,
          detail:
            'Already checked in. No duplicate visit was created.',
        });

        Vibration.vibrate([
          0,
          35,
          50,
          35,
        ]);
      } else {
        showSuccess(
          member.name,
          'Check-in confirmed.'
        );
      }

      await Promise.all([
        loadDesk(),
        searchMembers(query),
      ]);
    } catch (error: any) {
      Vibration.vibrate([
        0,
        60,
        70,
        60,
      ]);

      setNotice({
        tone: 'danger',
        title:
          'Check-in blocked',
        detail:
          error?.message ||
          'This member could not be checked in.',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const checkOut = async (
    visit: AttendanceVisit
  ) => {
    if (!isConnected) {
      setNotice({
        tone: 'warning',
        title: 'You are offline',
        detail:
          'Checkout also requires a live connection.',
      });
      return;
    }

    try {
      setBusyVisitId(visit.id);

      await attendanceService.checkOut(
        visit.id
      );

      showSuccess(
        visit.clientName,
        'Checkout confirmed.'
      );

      await Promise.all([
        loadDesk(),
        searchMembers(query),
      ]);
    } catch (error: any) {
      setNotice({
        tone: 'danger',
        title:
          'Checkout unavailable',
        detail:
          error?.message ||
          'Please try again.',
      });
    } finally {
      setBusyVisitId(null);
    }
  };

  const openScanner = () => {
    if (!isConnected) {
      setNotice({
        tone: 'warning',
        title: 'QR check-in is offline',
        detail:
          'Reconnect before scanning so membership can be validated.',
      });
      return;
    }

    navigation
      .getParent()
      ?.navigate('QRScanner');
  };

  const openMemberCard = (
    member: AttendanceMember
  ) => {
    navigation
      .getParent()
      ?.navigate(
        'MemberCard',
        {
          clientId: member.id,
          name: member.name,
          phone:
            member.phone || null,
          photoUrl:
            member.photoUrl || null,
          qrToken:
            member.qrToken,
          membershipStatus:
            member.membershipStatus,
          membershipDueDate:
            member.membershipDueDate ||
            null,
        }
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
          Preparing front desk...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDesk();
            searchMembers(query);
          }}
          tintColor={ui.color.brand}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>
              {activeGym?.name ||
                'ACTIVE GYM'}
            </Text>

            <Text style={styles.heroTitle}>
              Front desk
            </Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              Validate membership,
              check in and move to the
              next member quickly.
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scan member QR"
            activeOpacity={0.8}
            onPress={openScanner}
            style={[
              styles.scanButton,
              !isConnected &&
                styles.scanDisabled,
            ]}
          >
            <Ionicons
              name="scan-outline"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.scanText}>
              Scan QR
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <Metric
            value={String(
              summary.todayCount
            )}
            label="Today"
          />
          <View
            style={
              styles.metricDivider
            }
          />
          <Metric
            value={String(
              summary.insideCount
            )}
            label="Inside"
          />
          <View
            style={
              styles.metricDivider
            }
          />
          <Metric
            value={formatHour(
              summary.peakHour
            )}
            label="Peak"
          />
        </View>
      </View>

      {!isConnected ? (
        <View style={styles.offlineBar}>
          <Ionicons
            name="cloud-offline-outline"
            size={19}
            color={ui.color.warning}
          />
          <View style={styles.offlineCopy}>
            <Text
              style={
                styles.offlineTitle
              }
            >
              Attendance is online-only
            </Text>
            <Text
              style={
                styles.offlineText
              }
            >
              Existing information may
              remain visible, but no
              check-in or checkout will
              be confirmed while offline.
            </Text>
          </View>
        </View>
      ) : null}

      {notice ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Dismiss attendance message"
          activeOpacity={0.82}
          onPress={() =>
            setNotice(null)
          }
          style={[
            styles.notice,
            notice.tone ===
              'success' &&
              styles.noticeSuccess,
            notice.tone ===
              'warning' &&
              styles.noticeWarning,
            notice.tone ===
              'danger' &&
              styles.noticeDanger,
          ]}
        >
          <View
            style={[
              styles.noticeIcon,
              notice.tone ===
                'success' &&
                styles.noticeIconSuccess,
              notice.tone ===
                'warning' &&
                styles.noticeIconWarning,
              notice.tone ===
                'danger' &&
                styles.noticeIconDanger,
            ]}
          >
            <Ionicons
              name={
                notice.tone ===
                'success'
                  ? 'checkmark'
                  : notice.tone ===
                      'warning'
                    ? 'information'
                    : 'close'
              }
              size={18}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.noticeCopy}>
            <Text
              style={
                styles.noticeTitle
              }
            >
              {notice.title}
            </Text>
            <Text
              style={
                styles.noticeDetail
              }
            >
              {notice.detail}
            </Text>
          </View>

          <Ionicons
            name="close"
            size={17}
            color={ui.color.textMuted}
          />
        </TouchableOpacity>
      ) : null}

      <View style={styles.modeSwitch}>
        <ModeButton
          selected={
            mode === 'checkin'
          }
          label="Check in"
          icon="enter-outline"
          onPress={() =>
            setMode('checkin')
          }
        />

        <ModeButton
          selected={
            mode === 'inside'
          }
          label={`Inside now  -  ${currentlyInside.length}`}
          icon="people-outline"
          onPress={() =>
            setMode('inside')
          }
        />
      </View>

      {mode === 'checkin' ? (
        <>
          <SurfaceCard
            style={styles.searchCard}
          >
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={20}
                color={
                  ui.color.textMuted
                }
              />

              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search member name or phone"
                placeholderTextColor={
                  ui.color.textMuted
                }
                autoCorrect={false}
                editable={isConnected}
                returnKeyType="search"
              />

              {searching ? (
                <ActivityIndicator
                  size="small"
                  color={ui.color.brand}
                />
              ) : query ? (
                <TouchableOpacity
                  onPress={() =>
                    setQuery('')
                  }
                  style={
                    styles.clearButton
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={
                      ui.color.textMuted
                    }
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.searchHint}>
              Active members get a
              one-tap check-in. Expired
              members can go straight to
              renewal.
            </Text>
          </SurfaceCard>

          <SectionHeader
            title="Members"
            subtitle="Membership state is checked before each entry."
          />

          <SurfaceCard>
            {members.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={
                  isConnected
                    ? 'No members found'
                    : 'Reconnect to search'
                }
                body={
                  isConnected
                    ? 'Search by member name or phone number.'
                    : 'Membership eligibility must be validated online.'
                }
              />
            ) : (
              members.map(
                (member, index) => {
                  const status =
                    memberStatus(
                      member
                    );

                  const busy =
                    busyMemberId ===
                    member.id;

                  const renew =
                    status.action ===
                    'Renew';

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberRow,
                        index > 0 &&
                          styles.rowBorder,
                      ]}
                    >
                      {member.photoUrl ? (
                        <Image
                          source={{
                            uri:
                              member.photoUrl,
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
                        style={
                          styles.memberCopy
                        }
                      >
                        <Text
                          style={
                            styles.memberName
                          }
                          numberOfLines={1}
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

                        <View
                          style={
                            styles.memberMeta
                          }
                        >
                          <StatusPill
                            label={
                              status.label
                            }
                            toneName={
                              status.tone
                            }
                          />

                          {member.membershipDueDate ? (
                            <Text
                              style={
                                styles.dueText
                              }
                            >
                              {new Date(
                                member.membershipDueDate
                              ).toLocaleDateString()}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${member.name} member card`}
                        onPress={() =>
                          openMemberCard(
                            member
                          )
                        }
                        style={
                          styles.qrButton
                        }
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={19}
                          color={
                            ui.color.brand
                          }
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={
                          renew
                            ? `Renew ${member.name}`
                            : `${status.action} ${member.name}`
                        }
                        disabled={
                          busy ||
                          status.action ===
                            'Inside' ||
                          status.action ===
                            'Frozen' ||
                          !isConnected
                        }
                        onPress={() =>
                          checkIn(member)
                        }
                        style={[
                          styles.memberAction,
                          renew &&
                            styles.memberActionRenew,
                          (
                            status.action ===
                              'Inside' ||
                            status.action ===
                              'Frozen' ||
                            !isConnected
                          ) &&
                            styles.memberActionDisabled,
                        ]}
                      >
                        {busy ? (
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                          />
                        ) : (
                          <Text
                            style={[
                              styles.memberActionText,
                              renew &&
                                styles.memberActionRenewText,
                              (
                                status.action ===
                                  'Inside' ||
                                status.action ===
                                  'Frozen'
                              ) &&
                                styles.memberActionDisabledText,
                            ]}
                          >
                            {status.action}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }
              )
            )}
          </SurfaceCard>
        </>
      ) : (
        <>
          <SectionHeader
            title="Inside now"
            subtitle="Members with an open attendance visit."
          />

          <SurfaceCard>
            {currentlyInside.length ===
            0 ? (
              <EmptyState
                icon="walk-outline"
                title="Nobody is inside"
                body="Checked-in members will appear here for fast checkout."
              />
            ) : (
              currentlyInside.map(
                (visit, index) => (
                  <View
                    key={visit.id}
                    style={[
                      styles.visitRow,
                      index > 0 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View
                      style={
                        styles.visitIcon
                      }
                    >
                      <Ionicons
                        name={
                          visit.source ===
                          'qr'
                            ? 'qr-code-outline'
                            : 'walk-outline'
                        }
                        size={18}
                        color={
                          ui.color.success
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.visitCopy
                      }
                    >
                      <Text
                        style={
                          styles.visitName
                        }
                      >
                        {visit.clientName}
                      </Text>
                      <Text
                        style={
                          styles.visitMeta
                        }
                      >
                        In at{' '}
                        {new Date(
                          visit.checkInAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          }
                        )}
                        {'  -  '}
                        {visit.source.toUpperCase()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Check out ${visit.clientName}`}
                      disabled={
                        busyVisitId ===
                          visit.id ||
                        !isConnected
                      }
                      onPress={() =>
                        checkOut(visit)
                      }
                      style={[
                        styles.checkoutButton,
                        !isConnected &&
                          styles.memberActionDisabled,
                      ]}
                    >
                      {busyVisitId ===
                      visit.id ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            ui.color.brand
                          }
                        />
                      ) : (
                        <Text
                          style={
                            styles.checkoutText
                          }
                        >
                          Check out
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )
              )
            )}
          </SurfaceCard>
        </>
      )}

      <View style={styles.activitySection}>
        <SectionHeader
          title="Today’s activity"
          subtitle="Recent arrivals and departures."
        />

        <SurfaceCard>
          {today.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="No attendance yet"
              body="The first confirmed check-in will appear here."
            />
          ) : (
            today
              .slice(0, 12)
              .map(
                (visit, index) => (
                  <View
                    key={visit.id}
                    style={[
                      styles.activityRow,
                      index > 0 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.activityDot,
                        visit.checkOutAt &&
                          styles.activityDotClosed,
                      ]}
                    />

                    <View
                      style={
                        styles.activityCopy
                      }
                    >
                      <Text
                        style={
                          styles.activityName
                        }
                      >
                        {visit.clientName}
                      </Text>

                      <Text
                        style={
                          styles.activityMeta
                        }
                      >
                        {new Date(
                          visit.checkInAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          }
                        )}
                        {visit.checkOutAt
                          ? ` -> ${new Date(
                              visit.checkOutAt
                            ).toLocaleTimeString(
                              [],
                              {
                                hour:
                                  '2-digit',
                                minute:
                                  '2-digit',
                              }
                            )}`
                          : '  -  inside'}
                      </Text>
                    </View>

                    <StatusPill
                      label={
                        visit.source ===
                        'qr'
                          ? 'QR'
                          : 'MANUAL'
                      }
                      toneName="neutral"
                    />
                  </View>
                )
              )
          )}
        </SurfaceCard>
      </View>
    </ScrollView>
  );
};

const Metric = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>
      {value}
    </Text>
    <Text style={styles.metricLabel}>
      {label}
    </Text>
  </View>
);

const ModeButton = ({
  selected,
  label,
  icon,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    style={[
      styles.modeButton,
      selected &&
        styles.modeButtonSelected,
    ]}
  >
    <Ionicons
      name={icon}
      size={18}
      color={
        selected
          ? ui.color.brand
          : ui.color.textSecondary
      }
    />
    <Text
      style={[
        styles.modeText,
        selected &&
          styles.modeTextSelected,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: ui.space.lg,
    paddingBottom: 44,
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
    marginTop: 3,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: ui.type.bodySm,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 255,
  },
  scanButton: {
    minWidth: 82,
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: ui.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanDisabled: {
    opacity: 0.5,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  metricRow: {
    marginTop: ui.space.xl,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: ui.radius.lg,
    paddingVertical: ui.space.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#C7D2FE',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
  offlineBar: {
    backgroundColor: ui.color.warningSoft,
    borderWidth: 1,
    borderColor: ui.color.warningBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ui.space.sm,
    marginBottom: ui.space.md,
  },
  offlineCopy: {
    flex: 1,
  },
  offlineTitle: {
    color: ui.color.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  offlineText: {
    color: ui.color.warning,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  notice: {
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
    marginBottom: ui.space.md,
  },
  noticeSuccess: {
    borderColor: ui.color.successBorder,
  },
  noticeWarning: {
    borderColor: ui.color.warningBorder,
  },
  noticeDanger: {
    borderColor: ui.color.dangerBorder,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeIconSuccess: {
    backgroundColor: ui.color.success,
  },
  noticeIconWarning: {
    backgroundColor: ui.color.warning,
  },
  noticeIconDanger: {
    backgroundColor: ui.color.danger,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  noticeDetail: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  modeSwitch: {
    minHeight: 54,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor: ui.color.surface,
    padding: 5,
    flexDirection: 'row',
    gap: 5,
    marginBottom: ui.space.md,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: ui.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  modeButtonSelected: {
    backgroundColor: ui.color.brandSoft,
  },
  modeText: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '900',
  },
  modeTextSelected: {
    color: ui.color.brand,
  },
  searchCard: {
    padding: ui.space.md,
    marginBottom: ui.space.lg,
  },
  searchBox: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.md,
    backgroundColor: ui.color.surfaceSubtle,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
  },
  searchInput: {
    flex: 1,
    color: ui.color.text,
    fontSize: 13,
  },
  clearButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHint: {
    color: ui.color.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: ui.space.sm,
    marginHorizontal: 2,
  },
  memberRow: {
    minHeight: 77,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ui.space.md,
    paddingVertical: ui.space.sm,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    marginRight: ui.space.md,
    backgroundColor: ui.color.border,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 14,
    marginRight: ui.space.md,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: ui.color.brand,
    fontSize: 16,
    fontWeight: '900',
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  memberPhone: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  dueText: {
    color: ui.color.textMuted,
    fontSize: 8,
  },
  qrButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  memberAction: {
    minWidth: 66,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: ui.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    marginLeft: 6,
  },
  memberActionRenew: {
    backgroundColor: ui.color.warningSoft,
    borderWidth: 1,
    borderColor: ui.color.warningBorder,
  },
  memberActionDisabled: {
    backgroundColor: ui.color.surfaceSubtle,
    borderWidth: 1,
    borderColor: ui.color.border,
  },
  memberActionText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  memberActionRenewText: {
    color: ui.color.warning,
  },
  memberActionDisabledText: {
    color: ui.color.textMuted,
  },
  visitRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ui.space.md,
    paddingVertical: ui.space.sm,
  },
  visitIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: ui.color.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  visitCopy: {
    flex: 1,
  },
  visitName: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  visitMeta: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },
  checkoutButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: ui.color.brandSoft,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
  },
  activitySection: {
    marginTop: ui.space.xl,
  },
  activityRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ui.space.md,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ui.color.success,
    marginRight: ui.space.md,
  },
  activityDotClosed: {
    backgroundColor: ui.color.textMuted,
  },
  activityCopy: {
    flex: 1,
  },
  activityName: {
    color: ui.color.text,
    fontSize: 11,
    fontWeight: '900',
  },
  activityMeta: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
});

export default AttendanceScreen;
