import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens (we'll create these next)
import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import AddClientScreen from '../screens/AddClientScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import AddPaymentScreen from '../screens/AddPaymentScreen';
import LoginScreen from '../screens/LoginScreen';

// Update the ClientStack to include AddClientScreen


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Client Stack Navigator
const ClientStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ClientsList" component={ClientsScreen} options={{ title: 'Clients' }} />
    <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
    <Stack.Screen name="AddClient" component={AddClientScreen} options={{ title: 'Add Client' }} />
  </Stack.Navigator>
);

// Payment Stack Navigator
const PaymentStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="PaymentsList" component={PaymentsScreen} options={{ title: 'Payments' }} />
    <Stack.Screen name="AddPayment" component={AddPaymentScreen} options={{ title: 'Add Payment' }} />
  </Stack.Navigator>
);

// Main Tab Navigator
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
        } else {
          iconName = 'list';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Clients" component={ClientStack} />
    <Tab.Screen name="Payments" component={PaymentStack} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  // For now, we'll assume user is logged in. We'll add auth later.
  // In real app, you'd check AsyncStorage or context

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabs /> : <LoginScreen onLogin={() => setIsLoggedIn(true)} />}
    </NavigationContainer>
  );
};

export default AppNavigator;