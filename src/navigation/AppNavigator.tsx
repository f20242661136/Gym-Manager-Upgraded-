import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

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

import { useAuth } from '../contexts/AuthContext';
import { useGym } from '../contexts/GymContext';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const ClientStackNavigator = createStackNavigator();
const PaymentStackNavigator = createStackNavigator();
const OnboardingStackNavigator = createStackNavigator();
const SignedOutStackNavigator = createStackNavigator();

const sharedHeaderOptions = {
  headerStyle: {
    backgroundColor: '#312E81',
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  headerTitleAlign: 'center' as const,
};

const ClientStack = () => (
  <ClientStackNavigator.Navigator screenOptions={sharedHeaderOptions}>
    <ClientStackNavigator.Screen
      name="ClientsList"
      component={ClientsScreen}
      options={{ title: 'Clients', headerShown: false }}
    />
    <ClientStackNavigator.Screen
      name="ClientDetail"
      component={ClientDetailScreen}
      options={{ headerShown: false }}
    />
    <ClientStackNavigator.Screen
      name="AddClient"
      component={AddClientScreen}
      options={{ title: 'Add Client', headerShown: false }}
    />
  </ClientStackNavigator.Navigator>
);

const PaymentStack = () => (
  <PaymentStackNavigator.Navigator screenOptions={sharedHeaderOptions}>
    <PaymentStackNavigator.Screen
      name="PaymentsList"
      component={PaymentsScreen}
      options={{ title: 'Payments', headerShown: false }}
    />
    <PaymentStackNavigator.Screen
      name="AddPayment"
      component={AddPaymentScreen}
      options={{ title: 'Add Payment', headerShown: false }}
    />
  </PaymentStackNavigator.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        } else if (route.name === 'Clients') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Payments') {
          iconName = focused ? 'card' : 'card-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused
            ? 'notifications'
            : 'notifications-outline';
        } else {
          iconName = focused ? 'settings' : 'settings-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4F46E5',
      tabBarInactiveTintColor: '#64748B',
      headerStyle: {
        backgroundColor: '#312E81',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerTitleAlign: 'center',
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Clients" component={ClientStack} />
    <Tab.Screen name="Payments" component={PaymentStack} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ headerShown: false }}
    />
  </Tab.Navigator>
);

const SignedOutStack = () => (
  <SignedOutStackNavigator.Navigator
    screenOptions={{ headerShown: false }}
  >
    <SignedOutStackNavigator.Screen
      name="Login"
      component={LoginScreen}
    />
  </SignedOutStackNavigator.Navigator>
);

const GymOnboardingStack = () => (
  <OnboardingStackNavigator.Navigator
    initialRouteName="GymSetup"
    screenOptions={sharedHeaderOptions}
  >
    <OnboardingStackNavigator.Screen
      name="GymSetup"
      component={GymSetupScreen}
      options={{ title: 'Create or Join Gym', headerShown: false }}
    />
    <OnboardingStackNavigator.Screen
      name="JoinGym"
      component={JoinGymScreen}
      options={{ title: 'Join Gym' }}
    />
  </OnboardingStackNavigator.Navigator>
);

const AuthenticatedApp = () => (
  <RootStack.Navigator screenOptions={sharedHeaderOptions}>
    <RootStack.Screen
      name="Main"
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <RootStack.Screen
      name="GymManagement"
      component={GymManagementScreen}
      options={{ title: 'Gym Management' }}
    />
    <RootStack.Screen
      name="JoinGym"
      component={JoinGymScreen}
      options={{ title: 'Join Gym' }}
    />
    <RootStack.Screen
      name="StaffManagement"
      component={StaffManagementScreen}
      options={{ title: 'Staff & Roles' }}
    />
    <RootStack.Screen
      name="AuditLog"
      component={AuditLogScreen}
      options={{ title: 'Activity Log' }}
    />
  </RootStack.Navigator>
);

const AppNavigator = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { activeGym, isLoading: gymsLoading } = useGym();

  if (authLoading || (user && gymsLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading gym access...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <SignedOutStack />
      ) : activeGym ? (
        <AuthenticatedApp />
      ) : (
        <GymOnboardingStack />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '700',
  },
});

export default AppNavigator;