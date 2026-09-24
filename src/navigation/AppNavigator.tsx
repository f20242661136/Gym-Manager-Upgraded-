import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

import { useAuth } from '../contexts/AuthContext';
import { useGym } from '../contexts/GymContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ClientStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#6366F1',
        elevation: 4,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerTitleAlign: 'center',
    }}
  >
    <Stack.Screen name="ClientsList" component={ClientsScreen} options={{ title: 'Clients', headerShown: false }} />
    <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AddClient" component={AddClientScreen} options={{ title: 'Add Client', headerShown: false }} />
  </Stack.Navigator>
);

const PaymentStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#6366F1',
        elevation: 4,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerTitleAlign: 'center',
    }}
  >
    <Stack.Screen name="PaymentsList" component={PaymentsScreen} options={{ title: 'Payments', headerShown: false }} />
    <Stack.Screen name="AddPayment" component={AddPaymentScreen} options={{ title: 'Add Payment', headerShown: false }} />
  </Stack.Navigator>
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
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'notifications' : 'notifications-outline';
        } else {
          iconName = 'list';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'gray',
      headerStyle: {
        backgroundColor: '#6366F1',
        elevation: 4,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
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
    <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const { activeGym, isLoading: gymsLoading } = useGym();

  if (isLoading || gymsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading gym access...</Text>
      </View>
    );
  }

  if (user && !activeGym) {
    return (
      <NavigationContainer>
        <GymSetupScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
});

export default AppNavigator;
