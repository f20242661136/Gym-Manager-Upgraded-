import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAuth,
} from '../contexts/AuthContext';
import {
  useGym,
} from '../contexts/GymContext';
import {
  useSidePanel,
} from '../contexts/SidePanelContext';
import {
  type AppearanceMode,
  useAppearanceTheme,
} from '../theme/appearance';

type PanelItemProps = {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  border: string;
};

const PanelItem = ({
  icon,
  label,
  onPress,
  color,
  border,
}: PanelItemProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    activeOpacity={0.78}
    style={[
      styles.item,
      {
        borderBottomColor:
          border,
      },
    ]}
  >
    <Ionicons
      name={icon}
      size={20}
      color={color}
    />

    <Text
      style={[
        styles.itemText,
        { color },
      ]}
    >
      {label}
    </Text>

    <Ionicons
      name="chevron-forward"
      size={17}
      color={color}
    />
  </TouchableOpacity>
);

export const WorkspaceSidePanel = ({
  rootNavigation,
}: {
  rootNavigation: any;
}) => {
  const {
    isOpen,
    closePanel,
  } = useSidePanel();

  const {
    user,
    signOut,
  } = useAuth();

  const {
    activeGym,
  } = useGym();

  const theme =
    useAppearanceTheme();

  const insets =
    useSafeAreaInsets();

  const {
    width,
  } = useWindowDimensions();

  const colors =
    theme.colors;

  const panelWidth =
    Math.min(
      350,
      width * 0.88
    );

  const goRoot = (
    route: string,
    params?: any
  ) => {
    closePanel();
    rootNavigation.navigate(
      route,
      params
    );
  };

  const goTab = (
    screen: string
  ) =>
    goRoot(
      'RootTabs',
      { screen }
    );

  const setMode = async (
    mode: AppearanceMode
  ) => {
    await theme.setMode(mode);
  };

  const confirmSignOut =
    () => {
      Alert.alert(
        'Sign out?',
        'You can sign back in with the same account.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign out',
            style:
              'destructive',
            onPress:
              async () => {
                closePanel();
                await signOut();
              },
          },
        ]
      );
    };

  return (
    <Modal
      visible={isOpen}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={
        closePanel
      }
    >
      <View
        style={styles.modal}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close workspace menu"
          activeOpacity={1}
          onPress={closePanel}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop:
                insets.top + 12,
              paddingBottom:
                insets.bottom + 14,
              backgroundColor:
                colors.surface,
              borderRightColor:
                colors.border,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={[
                styles.identity,
                {
                  borderBottomColor:
                    colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      colors.brandSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    {
                      color:
                        colors.brand,
                    },
                  ]}
                >
                  {(
                    activeGym
                      ?.name?.[0] ||
                    user
                      ?.email?.[0] ||
                    'G'
                  ).toUpperCase()}
                </Text>
              </View>

              <View
                style={styles.identityCopy}
              >
                <Text
                  style={[
                    styles.gymName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {activeGym
                    ?.name ||
                    'Gym workspace'}
                </Text>

                <Text
                  style={[
                    styles.email,
                    {
                      color:
                        colors.secondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {user?.email ||
                    'Signed in'}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close workspace menu"
                onPress={closePanel}
                style={styles.close}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={
                    colors.secondary
                  }
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.section,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              WORKSPACE
            </Text>

            <PanelItem
              icon="home-outline"
              label="Dashboard"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goTab('Dashboard')
              }
            />

            <PanelItem
              icon="people-outline"
              label="Members"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goTab('Clients')
              }
            />

            <PanelItem
              icon="scan-outline"
              label="Attendance"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goTab('Attendance')
              }
            />

            <PanelItem
              icon="receipt-outline"
              label="Payments"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goTab('Payments')
              }
            />

            <PanelItem
              icon="settings-outline"
              label="Settings"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goTab('Settings')
              }
            />

            <Text
              style={[
                styles.section,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              MANAGEMENT
            </Text>

            <PanelItem
              icon="business-outline"
              label="Owner workspace"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'GymManagement'
                )
              }
            />

            <PanelItem
              icon="card-outline"
              label="Membership plans"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'MembershipPlans'
                )
              }
            />

            <PanelItem
              icon="people-circle-outline"
              label="Staff and roles"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'StaffManagement'
                )
              }
            />

            <PanelItem
              icon="cash-outline"
              label="Finance"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'FinanceDashboard'
                )
              }
            />

            <PanelItem
              icon="wallet-outline"
              label="Expenses"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'Expenses'
                )
              }
            />

            <PanelItem
              icon="notifications-outline"
              label="Notifications"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'Notifications'
                )
              }
            />

            <PanelItem
              icon="logo-whatsapp"
              label="WhatsApp tools"
              color={colors.text}
              border={colors.border}
              onPress={() =>
                goRoot(
                  'WhatsAppTools'
                )
              }
            />

            <Text
              style={[
                styles.section,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              APPEARANCE
            </Text>

            <View
              style={styles.modeRow}
            >
              {(
                [
                  'system',
                  'light',
                  'dark',
                ] as AppearanceMode[]
              ).map(mode => {
                const selected =
                  theme.mode === mode;

                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() =>
                      setMode(mode)
                    }
                    style={[
                      styles.mode,
                      {
                        backgroundColor:
                          selected
                            ? colors
                                .brandSoft
                            : colors
                                .surfaceSubtle,
                        borderColor:
                          selected
                            ? colors
                                .brand
                            : colors
                                .border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        {
                          color:
                            selected
                              ? colors
                                  .brand
                              : colors
                                  .secondary,
                        },
                      ]}
                    >
                      {mode[0]
                        .toUpperCase() +
                        mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={
                confirmSignOut
              }
              style={[
                styles.signOut,
                {
                  borderColor:
                    colors.dangerBorder,
                  backgroundColor:
                    colors.dangerSoft,
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.danger}
              />

              <Text
                style={[
                  styles.signOutText,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                Sign out
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    flexDirection: 'row',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(2,6,23,0.58)',
  },

  panel: {
    height: '100%',
    borderRightWidth: 1,
    elevation: 18,
    zIndex: 2,
  },

  identity: {
    minHeight: 92,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '900',
  },

  identityCopy: {
    flex: 1,
  },

  gymName: {
    fontSize: 16,
    fontWeight: '900',
  },

  email: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },

  close: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 7,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '900',
  },

  item: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  itemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },

  modeRow: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
  },

  mode: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  signOut: {
    margin: 16,
    marginTop: 24,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  signOutText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
