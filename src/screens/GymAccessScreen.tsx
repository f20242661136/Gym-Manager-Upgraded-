import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const GymAccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Unable to logout right now.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="barbell-outline" size={38} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Welcome to your gym workspace</Text>

        <Text style={styles.subtitle}>
          Create a new gym if you are the owner, or join an existing gym using
          the code provided by the owner or manager.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate('GymSetup')}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={28} color="#FFFFFF" />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.primaryTitle}>Create a gym</Text>
          <Text style={styles.primarySubtitle}>
            For owners starting a new gym workspace
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryCard}
        onPress={() => navigation.navigate('JoinGym')}
      >
        <View style={styles.secondaryIconContainer}>
          <Ionicons name="people-outline" size={28} color="#4F46E5" />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.secondaryTitle}>Join existing gym</Text>
          <Text style={styles.secondarySubtitle}>
            Enter the staff join code from your gym owner
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={24} color="#4F46E5" />
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Owners can share the staff join code from Gym Management.
      </Text>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#6B7280" />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = createAdaptiveStyles({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: ui.color.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: ui.color.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.color.brand,
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.color.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.color.border,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  secondaryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: ui.color.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  primaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  primarySubtitle: {
    color: '#E0E7FF',
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryTitle: {
    color: ui.color.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  secondarySubtitle: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  helpText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 22,
    fontSize: 13,
    lineHeight: 19,
  },
  logoutButton: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default GymAccessScreen;