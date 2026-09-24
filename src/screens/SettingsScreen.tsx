import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types/navigation';
import { exportDataAsCSV } from '../utils/dataExport';
import { storage } from '../services/storage';

const SettingsScreen: React.FC = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  React.useEffect(() => {
    // Load notification setting from storage on mount
    const loadNotificationSetting = async () => {
      try {
        const storedValue = await storage.getItem('notificationsEnabled');
        if (storedValue !== null) {
          setNotificationsEnabled(storedValue === 'true');
        }
      } catch (error) {
        console.error('Failed to load notification setting', error);
      }
    };
    loadNotificationSetting();
  }, []);

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      await storage.setItem('notificationsEnabled', newValue.toString());
      Alert.alert(
        'Notification Settings',
        `Notifications have been ${newValue ? 'enabled' : 'disabled'}.`
      );
    } catch (error) {
      console.error('Failed to save notification setting', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Alert.alert('Logged Out', 'You have been logged out successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      title: 'Gym Management',
      icon: 'business-outline',
      onPress: () => navigation.navigate('GymManagement'),
    },
    {
      title: 'Join Gym',
      icon: 'people-circle-outline',
      onPress: () => navigation.navigate('JoinGym'),
    },
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      onPress: toggleNotifications,
      accessory: (
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
        />
      ),
    },
    {
      title: 'Privacy',
      icon: 'lock-closed-outline',
      onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon.'),
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => Alert.alert('Coming Soon', 'Help & Support will be available soon.'),
    },
    {
      title: 'Export Data',
      icon: 'download-outline',
      onPress: async () => {
        try {
          await exportDataAsCSV();
          Alert.alert('Success', 'Data exported successfully!');
        } catch (error) {
          Alert.alert('Error', 'Failed to export data. Please try again.');
        }
      },
    },
    {
      title: 'About',
      icon: 'information-circle-outline',
      onPress: () => Alert.alert('Gym Management App', 'Version 1.0.0\nBuilt with React Native & Expo'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {settingsOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionItem}
            onPress={option.onPress}
            activeOpacity={option.accessory ? 1 : 0.7}
          >
            <View style={styles.optionLeft}>
              <Ionicons name={option.icon as any} size={24} color="#6B7280" />
              <Text style={styles.optionText}>{option.title}</Text>
            </View>
            {option.accessory ? option.accessory : <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Production-only settings; test buttons removed */}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 20,
    paddingBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default SettingsScreen;
