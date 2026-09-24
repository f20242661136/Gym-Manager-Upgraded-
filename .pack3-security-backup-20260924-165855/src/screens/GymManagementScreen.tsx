import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types/navigation';
import { useGym } from '../contexts/GymContext';

const GymManagementScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { gyms, activeGym, setActiveGym, refreshGyms } = useGym();

  const handleSwitchGym = async (gymId: string) => {
    try {
      await setActiveGym(gymId);
      await refreshGyms();
      Alert.alert('Gym switched', 'Your active gym has been updated.');
    } catch (error) {
      console.error('Failed to switch gym:', error);
      Alert.alert('Error', 'Unable to switch gym right now.');
    }
  };

  const shareJoinCode = async () => {
    if (!activeGym?.joinCode) {
      Alert.alert('No join code', 'No join code is available for this gym.');
      return;
    }

    await Share.share({
      message: `Join ${activeGym.name} in the gym app using code: ${activeGym.joinCode}`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gym management</Text>
      <Text style={styles.subtitle}>Your connected gyms and active workspace.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Current gym</Text>
        <Text style={styles.gymName}>{activeGym?.name || 'No gym selected'}</Text>
        <Text style={styles.gymMeta}>{activeGym?.slug || 'No slug'}</Text>

        {activeGym ? (
          <>
            <Text style={styles.marketMeta}>
              {activeGym.countryCode} â€¢ {activeGym.currencyCode} â€¢ {activeGym.timezone}
            </Text>

            <View style={styles.joinCodeBox}>
              <Text style={styles.joinCodeLabel}>Staff join code</Text>
              <Text style={styles.joinCode}>{activeGym.joinCode || 'Not available'}</Text>

              <TouchableOpacity style={styles.shareButton} onPress={shareJoinCode}>
                <Text style={styles.shareButtonText}>Share join code</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('JoinGym')}
        >
          <Text style={styles.primaryButtonText}>Join gym</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Your gyms</Text>

        {gyms.length === 0 ? (
          <Text style={styles.emptyState}>No gyms joined yet.</Text>
        ) : (
          gyms.map(gym => {
            const isActive = gym.id === activeGym?.id;

            return (
              <TouchableOpacity
                key={gym.id}
                style={[styles.gymRow, isActive && styles.activeGymRow]}
                onPress={() => handleSwitchGym(gym.id)}
              >
                <View style={styles.gymRowInfo}>
                  <Text style={styles.gymRowName}>{gym.name}</Text>
                  <Text style={styles.gymRowSlug}>
                    {gym.countryCode} â€¢ {gym.currencyCode}
                  </Text>
                </View>

                <Text style={[styles.gymStatus, isActive && styles.activeGymStatus]}>
                  {isActive ? 'Active' : 'Switch'}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    fontWeight: '700',
  },
  gymName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  gymMeta: {
    marginTop: 6,
    color: '#4F46E5',
    fontWeight: '600',
  },
  marketMeta: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
  },
  joinCodeBox: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  joinCodeLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  joinCode: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 6,
  },
  shareButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  shareButtonText: {
    color: '#4338CA',
    fontWeight: '700',
  },
  actionsRow: {
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyState: {
    color: '#6B7280',
    fontSize: 15,
  },
  gymRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeGymRow: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  gymRowInfo: {
    flex: 1,
  },
  gymRowName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  gymRowSlug: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
  },
  gymStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  activeGymStatus: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
  },
});

export default GymManagementScreen;