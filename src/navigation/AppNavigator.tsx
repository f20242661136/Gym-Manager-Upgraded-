import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  createStackNavigator,
} from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import AddClientScreen from '../screens/AddClientScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import AddPaymentScreen from '../screens/AddPaymentScreen';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import GymSetupScreen from '../screens/GymSetupScreen';
import GymManagementScreen from '../screens/GymManagementScreen';
import JoinGymScreen from '../screens/JoinGymScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import MembershipPlansScreen from '../screens/MembershipPlansScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import MemberCardScreen from '../screens/MemberCardScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import WhatsAppToolsScreen from '../screens/WhatsAppToolsScreen';
import PrivacyAccountScreen from '../screens/PrivacyAccountScreen';

import {
  useAuth,
} from '../contexts/AuthContext';
import {
  useGym,
} from '../contexts/GymContext';
import {
  SidePanelProvider,
  useSidePanel,
} from '../contexts/SidePanelContext';
import {
  LiveDataProvider,
  useLiveData,
} from '../contexts/LiveDataContext';
import {
  NotificationCenterProvider,
  useNotificationCenter,
} from '../contexts/NotificationCenterContext';
import {
  WorkspaceSidePanel,
} from '../components/WorkspaceSidePanel';
import {
  useAppearanceTheme,
} from '../theme/appearance';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const ClientStackNavigator = createStackNavigator();
const PaymentStackNavigator = createStackNavigator();
const GymOnboardingStack = createStackNavigator();

const withLiveRefresh = (
  Component: React.ComponentType<any>
) => {
  const LiveComponent = (
    props: any
  ) => {
    const {
      revision,
    } = useLiveData();

    const isFocused =
      useIsFocused();

    return (
      <Component
        key={
          `${revision}-${isFocused ? 'focused' : 'blurred'}`
        }
        {...props}
      />
    );
  };

  return LiveComponent;
};

const LiveDashboard =
  withLiveRefresh(
    DashboardScreen
  );

const LiveClients =
  withLiveRefresh(
    ClientsScreen
  );

const LiveClientDetail =
  withLiveRefresh(
    ClientDetailScreen
  );

const LivePayments =
  withLiveRefresh(
    PaymentsScreen
  );

const LiveAttendance =
  withLiveRefresh(
    AttendanceScreen
  );

const LiveMemberCard =
  withLiveRefresh(
    MemberCardScreen
  );

const LiveFinance =
  withLiveRefresh(
    FinanceDashboardScreen
  );

const LiveExpenses =
  withLiveRefresh(
    ExpensesScreen
  );

const ClientStack = () => {
  const theme =
    useAppearanceTheme();

  return (
    <ClientStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor:
            theme.colors.canvas,
        },
      }}
    >
      <ClientStackNavigator.Screen
        name="ClientsList"
        component={LiveClients}
      />
      <ClientStackNavigator.Screen
        name="ClientDetail"
        component={LiveClientDetail}
      />
      <ClientStackNavigator.Screen
        name="AddClient"
        component={AddClientScreen}
      />
    </ClientStackNavigator.Navigator>
  );
};

const PaymentStack = () => {
  const theme =
    useAppearanceTheme();

  return (
    <PaymentStackNavigator.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor:
            theme.colors.canvas,
        },
      }}
    >
      <PaymentStackNavigator.Screen
        name="PaymentsList"
        component={LivePayments}
      />
      <PaymentStackNavigator.Screen
        name="AddPayment"
        component={AddPaymentScreen}
      />
    </PaymentStackNavigator.Navigator>
  );
};

const MainTabShell = ({
  rootNavigation,
}: {
  rootNavigation: any;
}) => {
  const theme =
    useAppearanceTheme();

  const insets =
    useSafeAreaInsets();

  const {
    activeGym,
  } = useGym();

  const {
    openPanel,
  } = useSidePanel();

  const {
    unreadCount,
    realtimeConnected,
  } =
    useNotificationCenter();

  const bottomInset =
    Math.max(
      insets.bottom,
      8
    );

  const badgeLabel =
    unreadCount > 99
      ? '99+'
      : String(
          unreadCount
        );

  return (
    <SafeAreaView
      style={[
        styles.mainShell,
        {
          backgroundColor:
            theme.colors.surface,
        },
      ]}
      edges={['top']}
    >
      <View
        style={[
          styles.topBar,
          {
            backgroundColor:
              theme.colors.surface,
            borderBottomColor:
              theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open workspace menu"
          onPress={openPanel}
          activeOpacity={0.75}
          style={[
            styles.topButton,
            {
              backgroundColor:
                theme.colors.surfaceSubtle,
              borderColor:
                theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="menu"
            size={25}
            color={
              theme.colors.text
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.topBarCopy
          }
        >
          <Text
            numberOfLines={1}
            style={[
              styles.topBarTitle,
              {
                color:
                  theme.colors.text,
              },
            ]}
          >
            {activeGym?.name ||
              'Gym Manager'}
          </Text>

          <View
            style={
              styles.topBarSubRow
            }
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    realtimeConnected
                      ? theme.colors.brand
                      : theme.colors.muted,
                },
              ]}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.topBarSubtitle,
                {
                  color:
                    theme.colors.muted,
                },
              ]}
            >
              {realtimeConnected
                ? 'Live front desk'
                : 'Front desk workspace'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          onPress={() =>
            rootNavigation.navigate(
              'Notifications'
            )
          }
          activeOpacity={0.75}
          style={[
            styles.topButton,
            {
              backgroundColor:
                unreadCount > 0
                  ? theme.colors.brandSoft
                  : theme.colors.surfaceSubtle,
              borderColor:
                unreadCount > 0
                  ? theme.colors.brand
                  : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={
              unreadCount > 0
                ? 'notifications'
                : 'notifications-outline'
            }
            size={22}
            color={
              unreadCount > 0
                ? theme.colors.brand
                : theme.colors.text
            }
          />

          {unreadCount > 0 ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    theme.colors.danger,
                },
              ]}
            >
              <Text
                style={
                  styles.badgeText
                }
              >
                {badgeLabel}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View
        style={styles.tabArea}
      >
        <Tab.Navigator
          screenOptions={({
            route,
          }) => ({
            headerShown: false,
            tabBarHideOnKeyboard:
              true,

            tabBarIcon: ({
              focused,
              color,
              size,
            }) => {
              let iconName:
                keyof typeof Ionicons.glyphMap;

              if (
                route.name ===
                'Dashboard'
              ) {
                iconName =
                  focused
                    ? 'home'
                    : 'home-outline';
              } else if (
                route.name ===
                'Clients'
              ) {
                iconName =
                  focused
                    ? 'people'
                    : 'people-outline';
              } else if (
                route.name ===
                'Attendance'
              ) {
                iconName =
                  focused
                    ? 'scan-circle'
                    : 'scan-circle-outline';
              } else if (
                route.name ===
                'Payments'
              ) {
                iconName =
                  focused
                    ? 'receipt'
                    : 'receipt-outline';
              } else {
                iconName =
                  focused
                    ? 'settings'
                    : 'settings-outline';
              }

              return (
                <Ionicons
                  name={iconName}
                  size={size}
                  color={color}
                />
              );
            },

            tabBarActiveTintColor:
              theme.colors.brand,

            tabBarInactiveTintColor:
              theme.colors.muted,

            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '800',
              marginTop: 1,
            },

            tabBarItemStyle: {
              flex: 1,
              paddingHorizontal: 0,
            },

            tabBarStyle: {
              height:
                58 +
                bottomInset,
              paddingTop: 6,
              paddingBottom:
                bottomInset,
              paddingHorizontal: 0,
              backgroundColor:
                theme.colors.surface,
              borderTopColor:
                theme.colors.border,
              borderTopWidth:
                StyleSheet.hairlineWidth,
              elevation: 0,
            },
          })}
        >
          <Tab.Screen
            name="Dashboard"
            component={
              LiveDashboard
            }
          />

          <Tab.Screen
            name="Clients"
            component={
              ClientStack
            }
            options={{
              title: 'Members',
            }}
          />

          <Tab.Screen
            name="Attendance"
            component={
              LiveAttendance
            }
          />

          <Tab.Screen
            name="Payments"
            component={
              PaymentStack
            }
          />

          <Tab.Screen
            name="Settings"
            component={
              SettingsScreen
            }
          />
        </Tab.Navigator>
      </View>

      <WorkspaceSidePanel
        rootNavigation={
          rootNavigation
        }
      />
    </SafeAreaView>
  );
};

const MainTabs = ({
  navigation,
}: any) => (
  <SidePanelProvider>
    <MainTabShell
      rootNavigation={
        navigation
      }
    />
  </SidePanelProvider>
);

const GymEntry = () => (
  <GymOnboardingStack.Navigator
    initialRouteName="GymSetup"
    screenOptions={{
      headerShown: false,
    }}
  >
    <GymOnboardingStack.Screen
      name="GymSetup"
      component={
        GymSetupScreen
      }
    />

    <GymOnboardingStack.Screen
      name="JoinGym"
      component={
        JoinGymScreen
      }
    />
  </GymOnboardingStack.Navigator>
);

const AuthenticatedApp = () => {
  const theme =
    useAppearanceTheme();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor:
            theme.isDark
              ? '#17213A'
              : '#312E81',
        },
        headerTintColor:
          '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 17,
        },
        headerTitleAlign:
          'center',
        cardStyle: {
          backgroundColor:
            theme.colors.canvas,
        },
      }}
    >
      <RootStack.Screen
        name="RootTabs"
        component={MainTabs}
        options={{
          headerShown: false,
        }}
      />

      <RootStack.Screen
        name="Notifications"
        component={
          NotificationsScreen
        }
        options={{
          title:
            'Notifications',
        }}
      />

      <RootStack.Screen
        name="GymManagement"
        component={
          GymManagementScreen
        }
        options={{
          title:
            'Owner workspace',
        }}
      />

      <RootStack.Screen
        name="JoinGym"
        component={
          JoinGymScreen
        }
        options={{
          headerShown: false,
        }}
      />

      <RootStack.Screen
        name="StaffManagement"
        component={
          StaffManagementScreen
        }
        options={{
          title:
            'Staff and Roles',
        }}
      />

      <RootStack.Screen
        name="AuditLog"
        component={
          AuditLogScreen
        }
        options={{
          title:
            'Activity Log',
        }}
      />

      <RootStack.Screen
        name="MembershipPlans"
        component={
          MembershipPlansScreen
        }
        options={{
          title:
            'Membership Plans',
        }}
      />

      <RootStack.Screen
        name="QRScanner"
        component={
          QRScannerScreen
        }
        options={{
          headerShown: false,
          presentation:
            'modal',
        }}
      />

      <RootStack.Screen
        name="MemberCard"
        component={
          LiveMemberCard
        }
        options={{
          title:
            'Member Card',
        }}
      />

      <RootStack.Screen
        name="FinanceDashboard"
        component={
          LiveFinance
        }
        options={{
          title: 'Finance',
        }}
      />

      <RootStack.Screen
        name="Expenses"
        component={
          LiveExpenses
        }
        options={{
          title:
            'Expenses',
        }}
      />

      <RootStack.Screen
        name="Receipt"
        component={
          ReceiptScreen
        }
        options={{
          title:
            'Receipt',
        }}
      />

      <RootStack.Screen
        name="WhatsAppTools"
        component={
          WhatsAppToolsScreen
        }
        options={{
          title:
            'WhatsApp Tools',
        }}
      />

        <RootStack.Screen
          name="PrivacyAccount"
          component={PrivacyAccountScreen}
          options={{
            title: 'Privacy and Account',
          }}
        />

    </RootStack.Navigator>
  );
};

const NavigationShell = () => {
  const {
    user,
    isLoading:
      authLoading,
  } = useAuth();

  const {
    activeGym,
    isLoading:
      gymsLoading,
  } = useGym();

  const theme =
    useAppearanceTheme();

  if (
    authLoading ||
    (user &&
      gymsLoading)
  ) {
    return (
      <View
        style={[
          styles.loading,
          {
            backgroundColor:
              theme.colors.canvas,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.colors.brand
          }
        />
      </View>
    );
  }

  const base =
    theme.isDark
      ? DarkTheme
      : DefaultTheme;

  const navigationTheme = {
    ...base,
    dark:
      theme.isDark,
    colors: {
      ...base.colors,
      primary:
        theme.colors.brand,
      background:
        theme.colors.canvas,
      card:
        theme.colors.surface,
      text:
        theme.colors.text,
      border:
        theme.colors.border,
      notification:
        theme.colors.danger,
    },
  };

  return (
    <>
      <StatusBar
        style={
          theme.isDark
            ? 'light'
            : 'dark'
        }
      />

      <NavigationContainer
        key={
          `appearance-${theme.mode}-${theme.resolved}`
        }
        theme={
          navigationTheme
        }
      >
        {!user ? (
          <LoginScreen />
        ) : activeGym ? (
          <AuthenticatedApp />
        ) : (
          <GymEntry />
        )}
      </NavigationContainer>
    </>
  );
};

const AppNavigator = () => (
  <LiveDataProvider>
    <NotificationCenterProvider>
      <NavigationShell />
    </NotificationCenterProvider>
  </LiveDataProvider>
);

const styles =
  StyleSheet.create({
    mainShell: {
      flex: 1,
    },

    tabArea: {
      flex: 1,
    },

    topBar: {
      minHeight: 58,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    topButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    topBarCopy: {
      flex: 1,
      paddingHorizontal: 12,
    },

    topBarTitle: {
      fontSize: 16,
      fontWeight: '900',
    },

    topBarSubRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
    },

    topBarSubtitle: {
      flex: 1,
      fontSize: 10,
      fontWeight: '700',
    },

    badge: {
      position: 'absolute',
      top: -5,
      right: -7,
      minWidth: 19,
      height: 19,
      borderRadius: 999,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },

    badgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AppNavigator;
