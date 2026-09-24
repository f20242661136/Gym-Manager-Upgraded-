import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGym } from '../contexts/GymContext';
import { useGymPermissions } from '../hook/useGymPermissions';
import { roleLabel } from '../config/permissions';

const GymManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { gyms, activeGym, setActiveGym, refreshGyms } = useGym();
  const { role, permissions } = useGymPermissions();

  const handleSwitchGym = async (gymId: string) => {
    try {
      await setActiveGym(gymId);
      await refreshGyms();
      Alert.alert('Gym switched', 'Your active workspace has been updated.');
    } catch (error) {
      console.error('Failed to switch gym:', error);
      Alert.alert('Error', 'Unable to switch gym right now.');
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.gymMark}>
            <Ionicons name="barbell-outline" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>ACTIVE WORKSPACE</Text>
            <Text style={styles.gymName}>
              {activeGym?.name || 'No gym selected'}
            </Text>
            <Text style={styles.gymMeta}>
              {activeGym?.countryCode === 'IN' ? 'India' : 'Pakistan'}
              {'  |  '}
              {activeGym?.currencyCode || 'PKR'}
            </Text>
          </View>
        </View>

        <View style={styles.accessPill}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#C7D2FE" />
          <Text style={styles.accessText}>
            {role ? roleLabel(role) : 'Loading access'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MANAGE</Text>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('StaffManagement')}
      >
        <View style={[styles.actionIcon, styles.actionIconIndigo]}>
          <Ionicons name="people-outline" size={23} color="#4F46E5" />
        </View>

        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Staff & roles</Text>
          <Text style={styles.actionSubtitle}>
            View your team, permissions and staff access.
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={21} color="#94A3B8" />
      </TouchableOpacity>

      {permissions.canViewAudit ? (
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AuditLog')}
        >
          <View style={[styles.actionIcon, styles.actionIconGreen]}>
            <Ionicons name="time-outline" size={23} color="#047857" />
          </View>

          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Activity log</Text>
            <Text style={styles.actionSubtitle}>
              Review important staff and financial actions.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={21} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('JoinGym')}
      >
        <View style={[styles.actionIcon, styles.actionIconAmber]}>
          <Ionicons name="person-add-outline" size={23} color="#B45309" />
        </View>

        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Join another gym</Text>
          <Text style={styles.actionSubtitle}>
            Accept a temporary invitation from another workspace.
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={21} color="#94A3B8" />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>YOUR WORKSPACES</Text>

      <View style={styles.card}>
        {gyms.length === 0 ? (
          <Text style={styles.emptyState}>No gyms joined yet.</Text>
        ) : (
          gyms.map((gym, index) => {
            const isActive = gym.id === activeGym?.id;

            return (
              <TouchableOpacity
                key={gym.id}
                style={[
                  styles.gymRow,
                  index > 0 && styles.gymRowBorder,
                ]}
                onPress={() => handleSwitchGym(gym.id)}
              >
                <View style={styles.gymRowIcon}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={isActive ? '#4F46E5' : '#64748B'}
                  />
                </View>

                <View style={styles.gymRowInfo}>
                  <Text style={styles.gymRowName}>{gym.name}</Text>
                  <Text style={styles.gymRowSlug}>
                    {gym.countryCode} Â· {gym.currencyCode}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isActive && styles.statusBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isActive && styles.statusTextActive,
                    ]}
                  >
                    {isActive ? 'Active' : 'Switch'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.securityNote}>
        <Ionicons
          name="lock-closed-outline"
          size={19}
          color="#475569"
        />
        <Text style={styles.securityText}>
          Staff invitations now expire automatically. The old permanent join
          code is no longer used for new staff access.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  hero: {
    backgroundColor: '#312E81',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gymMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  gymMeta: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  accessPill: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 9,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  actionIconIndigo: {
    backgroundColor: '#EEF2FF',
  },
  actionIconGreen: {
    backgroundColor: '#ECFDF5',
  },
  actionIconAmber: {
    backgroundColor: '#FFFBEB',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  gymRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gymRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  gymRowInfo: {
    flex: 1,
  },
  gymRowName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  gymRowSlug: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#EEF2FF',
  },
  statusText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
  },
  statusTextActive: {
    color: '#4F46E5',
  },
  emptyState: {
    color: '#94A3B8',
    paddingVertical: 18,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    padding: 14,
    gap: 9,
  },
  securityText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});

export default GymManagementScreen;