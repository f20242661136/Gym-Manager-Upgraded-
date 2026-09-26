import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import {
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

type ToolTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'neutral';

type OwnerTool = {
  route: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tone: ToolTone;
};

const colorsFor = (
  tone: ToolTone
) => {
  if (tone === 'success') {
    return {
      background:
        ui.color.successSoft,
      foreground:
        ui.color.success,
    };
  }

  if (tone === 'warning') {
    return {
      background:
        ui.color.warningSoft,
      foreground:
        ui.color.warning,
    };
  }

  if (tone === 'neutral') {
    return {
      background:
        ui.color.surfaceSubtle,
      foreground:
        ui.color.textSecondary,
    };
  }

  return {
    background:
      ui.color.brandSoft,
    foreground:
      ui.color.brand,
  };
};

const moneyTools: OwnerTool[] = [
  {
    route: 'FinanceDashboard',
    icon: 'analytics-outline',
    title: 'Finance overview',
    subtitle:
      'Revenue, expenses, net and renewal follow-up.',
    tone: 'brand',
  },
  {
    route: 'Expenses',
    icon: 'wallet-outline',
    title: 'Expenses',
    subtitle:
      'Record and review operating costs.',
    tone: 'warning',
  },
];

const membershipTools: OwnerTool[] = [
  {
    route: 'MembershipPlans',
    icon: 'pricetags-outline',
    title: 'Membership plans',
    subtitle:
      'Pricing, duration and admission fees.',
    tone: 'success',
  },
];

const teamTools: OwnerTool[] = [
  {
    route: 'StaffManagement',
    icon: 'people-outline',
    title: 'Staff & roles',
    subtitle:
      'Invitations, access roles and team status.',
    tone: 'brand',
  },
  {
    route: 'AuditLog',
    icon: 'document-text-outline',
    title: 'Activity log',
    subtitle:
      'Review important administrative actions.',
    tone: 'neutral',
  },
];

const GymManagementScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const {
    gyms,
    activeGym,
    setActiveGym,
    refreshGyms,
  } = useGym();

  const [
    switchingGymId,
    setSwitchingGymId,
  ] =
    useState<string | null>(null);

  const openTool = (
    route: string
  ) => {
    navigation.navigate(route);
  };

  const switchGym = async (
    gymId: string
  ) => {
    if (
      gymId === activeGym?.id
    ) {
      return;
    }

    try {
      setSwitchingGymId(gymId);

      await setActiveGym(gymId);
      await refreshGyms();

      Alert.alert(
        'Workspace switched',
        'The selected gym is now active.'
      );
    } catch (error: any) {
      console.error(
        'Gym switch failed:',
        error
      );

      Alert.alert(
        'Unable to switch gym',
        error?.message ||
          'Please try again.'
      );
    } finally {
      setSwitchingGymId(null);
    }
  };

  const countryLabel =
    activeGym?.countryCode === 'IN'
      ? 'India'
      : activeGym?.countryCode === 'PK'
        ? 'Pakistan'
        : activeGym?.countryCode ||
          'Market not set';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View
            style={styles.heroIcon}
          >
            <Ionicons
              name="grid-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <StatusPill
            label="OWNER WORKSPACE"
            toneName="brand"
          />
        </View>

        <Text
          style={styles.eyebrow}
        >
          {activeGym?.name ||
            'ACTIVE GYM'}
        </Text>

        <Text
          style={styles.heroTitle}
        >
          Run the business
        </Text>

        <Text
          style={
            styles.heroSubtitle
          }
        >
          Finance, memberships, staff
          and workspace controls in one
          place. Daily front-desk work
          stays in the main tabs.
        </Text>
      </View>

      <SurfaceCard
        style={styles.gymCard}
      >
        <View
          style={styles.gymCardTop}
        >
          <View style={styles.flex}>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              ACTIVE WORKSPACE
            </Text>

            <Text
              style={styles.gymName}
            >
              {activeGym?.name ||
                'No gym selected'}
            </Text>
          </View>

          <View
            style={
              styles.activeBadge
            }
          >
            <View
              style={
                styles.activeDot
              }
            />
            <Text
              style={
                styles.activeText
              }
            >
              Active
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta
            icon="location-outline"
            label="Market"
            value={countryLabel}
          />

          <Meta
            icon="cash-outline"
            label="Currency"
            value={
              activeGym?.currencyCode ||
              '-'
            }
          />

          <Meta
            icon="time-outline"
            label="Timezone"
            value={
              activeGym?.timezone ||
              '-'
            }
          />

          <Meta
            icon="key-outline"
            label="Join code"
            value={
              activeGym?.joinCode ||
              '-'
            }
          />
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader
          title="Money"
          subtitle="Owner-level financial controls."
        />

        <View style={styles.toolGrid}>
          {moneyTools.map(tool => (
            <ToolCard
              key={tool.route}
              tool={tool}
              onPress={() =>
                openTool(tool.route)
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Memberships"
          subtitle="What the gym sells and how memberships are structured."
        />

        <View style={styles.toolGrid}>
          {membershipTools.map(
            tool => (
              <ToolCard
                key={tool.route}
                tool={tool}
                wide
                onPress={() =>
                  openTool(
                    tool.route
                  )
                }
              />
            )
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Team & security"
          subtitle="Who can access the gym workspace and what changed."
        />

        <View style={styles.toolGrid}>
          {teamTools.map(tool => (
            <ToolCard
              key={tool.route}
              tool={tool}
              onPress={() =>
                openTool(tool.route)
              }
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Workspaces"
          subtitle="Switch between gyms without mixing their active workspace."
          actionLabel="Join gym"
          onAction={() =>
            navigation.navigate(
              'JoinGym'
            )
          }
        />

        <SurfaceCard>
          {gyms.map(
            (gym, index) => {
              const selected =
                gym.id ===
                activeGym?.id;

              const busy =
                switchingGymId ===
                gym.id;

              return (
                <TouchableOpacity
                  key={gym.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selected
                      ? `${gym.name}, active workspace`
                      : `Switch to ${gym.name}`
                  }
                  disabled={
                    selected ||
                    switchingGymId !==
                      null
                  }
                  activeOpacity={0.76}
                  onPress={() =>
                    switchGym(gym.id)
                  }
                  style={[
                    styles.gymRow,
                    index > 0 &&
                      styles.rowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.gymIcon,
                      selected &&
                        styles.gymIconActive,
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={19}
                      color={
                        selected
                          ? ui.color.brand
                          : ui.color.textSecondary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.gymRowCopy
                    }
                  >
                    <Text
                      style={
                        styles.gymRowName
                      }
                    >
                      {gym.name}
                    </Text>

                    <Text
                      style={
                        styles.gymRowMeta
                      }
                    >
                      {gym.currencyCode ||
                        'Currency'}
                      {'  -  '}
                      {gym.countryCode ||
                        'Market'}
                    </Text>
                  </View>

                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        ui.color.brand
                      }
                    />
                  ) : selected ? (
                    <StatusPill
                      label="ACTIVE"
                      toneName="success"
                    />
                  ) : (
                    <View
                      style={
                        styles.switchAction
                      }
                    >
                      <Text
                        style={
                          styles.switchText
                        }
                      >
                        Switch
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={
                          ui.color.brand
                        }
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          )}

          {gyms.length === 0 ? (
            <View
              style={
                styles.emptyGyms
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                No connected gyms
              </Text>
              <Text
                style={
                  styles.emptyText
                }
              >
                Join or create a gym to
                use the owner workspace.
              </Text>
            </View>
          ) : null}
        </SurfaceCard>
      </View>

      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={ui.color.textSecondary}
        />

        <View style={styles.flex}>
          <Text
            style={
              styles.infoTitle
            }
          >
            Keep daily work simple
          </Text>

          <Text
            style={styles.infoText}
          >
            Members, attendance and
            payments remain in the five
            main tabs. This workspace is
            intentionally reserved for
            management tasks.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const ToolCard = ({
  tool,
  wide = false,
  onPress,
}: {
  tool: OwnerTool;
  wide?: boolean;
  onPress: () => void;
}) => {
  const colors =
    colorsFor(tool.tone);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.77}
      onPress={onPress}
      style={[
        styles.toolCard,
        wide &&
          styles.toolCardWide,
      ]}
    >
      <View
        style={[
          styles.toolIcon,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <Ionicons
          name={tool.icon}
          size={21}
          color={
            colors.foreground
          }
        />
      </View>

      <Text
        style={styles.toolTitle}
      >
        {tool.title}
      </Text>

      <Text
        style={
          styles.toolSubtitle
        }
      >
        {tool.subtitle}
      </Text>

      <View
        style={styles.toolFooter}
      >
        <Text
          style={styles.openText}
        >
          Open
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={ui.color.brand}
        />
      </View>
    </TouchableOpacity>
  );
};

const Meta = ({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.metaItem}>
    <View
      style={styles.metaIcon}
    >
      <Ionicons
        name={icon}
        size={16}
        color={ui.color.brand}
      />
    </View>

    <View style={styles.flex}>
      <Text
        style={styles.metaLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.metaValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  </View>
);

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor:
      ui.color.canvas,
  },

  content: {
    padding: ui.space.lg,
    paddingBottom: 46,
  },

  flex: {
    flex: 1,
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

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyebrow: {
    color: '#C7D2FE',
    fontSize: ui.type.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: ui.space.lg,
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
    marginTop: 5,
    maxWidth: 330,
  },

  gymCard: {
    padding: ui.space.lg,
    marginBottom: ui.space.xl,
  },

  gymCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
  },

  sectionEyebrow: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  gymName: {
    color: ui.color.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },

  activeBadge: {
    minHeight: 34,
    borderRadius: ui.radius.pill,
    backgroundColor:
      ui.color.successSoft,
    borderWidth: 1,
    borderColor:
      ui.color.successBorder,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      ui.color.success,
  },

  activeText: {
    color: ui.color.success,
    fontSize: 9,
    fontWeight: '900',
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
    marginTop: ui.space.lg,
  },

  metaItem: {
    width: '48%',
    minHeight: 58,
    borderRadius: ui.radius.md,
    backgroundColor:
      ui.color.surfaceSubtle,
    padding: ui.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor:
      ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.sm,
  },

  metaLabel: {
    color: ui.color.textMuted,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  metaValue: {
    color: ui.color.text,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  section: {
    marginBottom: ui.space.xl,
  },

  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
  },

  toolCard: {
    width: '48.5%',
    minHeight: 150,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor:
      ui.color.surface,
    padding: ui.space.md,
  },

  toolCardWide: {
    width: '100%',
    minHeight: 134,
  },

  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.md,
  },

  toolTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  toolSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
    flex: 1,
  },

  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: ui.space.md,
  },

  openText: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
  },

  gymRow: {
    minHeight: 72,
    paddingHorizontal: ui.space.md,
    paddingVertical: ui.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor:
      ui.color.divider,
  },

  gymIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      ui.color.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  gymIconActive: {
    backgroundColor:
      ui.color.brandSoft,
  },

  gymRowCopy: {
    flex: 1,
  },

  gymRowName: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  gymRowMeta: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  switchAction: {
    minHeight: ui.touch.min,
    paddingLeft: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  switchText: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
  },

  emptyGyms: {
    padding: ui.space.xl,
    alignItems: 'center',
  },

  emptyTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  emptyText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },

  infoCard: {
    backgroundColor:
      ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ui.space.sm,
  },

  infoTitle: {
    color: ui.color.text,
    fontSize: 10,
    fontWeight: '900',
  },

  infoText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
});

export default GymManagementScreen;