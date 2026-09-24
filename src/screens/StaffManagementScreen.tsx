import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../contexts/GymContext';
import { staffService } from '../services/staffService';
import { useGymPermissions } from '../hook/useGymPermissions';
import {
  INVITABLE_ROLES,
  ROLE_PERMISSIONS,
  roleLabel,
} from '../config/permissions';
import type {
  GymRole,
  GymStaffMember,
  InvitationRole,
  StaffInvitation,
} from '../types/gym';

const roleTint: Record<GymRole, { bg: string; fg: string }> = {
  owner: { bg: '#FEF3C7', fg: '#92400E' },
  admin: { bg: '#EDE9FE', fg: '#5B21B6' },
  manager: { bg: '#DBEAFE', fg: '#1D4ED8' },
  receptionist: { bg: '#D1FAE5', fg: '#047857' },
  trainer: { bg: '#FFE4E6', fg: '#BE123C' },
  staff: { bg: '#F1F5F9', fg: '#475569' },
};

const StaffManagementScreen: React.FC = () => {
  const { activeGym, activeGymId } = useGym();
  const { role, permissions, isLoading: roleLoading } = useGymPermissions();

  const [staff, setStaff] = useState<GymStaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [selectedRole, setSelectedRole] =
    useState<InvitationRole>('receptionist');
  const [email, setEmail] = useState('');
  const [expiryHours, setExpiryHours] = useState<24 | 48 | 72>(48);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allowedInviteRoles = useMemo(
    () =>
      INVITABLE_ROLES.filter(
        item => item !== 'admin' || permissions.canInviteAdmin
      ),
    [permissions.canInviteAdmin]
  );

  const load = useCallback(async () => {
    if (!activeGymId) return;

    try {
      const staffRows = await staffService.listStaff(activeGymId);
      setStaff(staffRows);

      if (permissions.canManageStaff) {
        const invitationRows =
          await staffService.listInvitations(activeGymId);
        setInvitations(invitationRows);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('Failed to load staff:', error);
      Alert.alert(
        'Unable to load staff',
        error?.message || 'Please try again.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeGymId, permissions.canManageStaff]);

  useEffect(() => {
    if (!roleLoading) {
      setIsLoading(true);
      load();
    }
  }, [load, roleLoading]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const createInvite = async () => {
    if (!activeGymId || !activeGym) return;

    try {
      setIsCreating(true);

      const invite = await staffService.createInvitation({
        gymId: activeGymId,
        role: selectedRole,
        email: email.trim() || null,
        expiresHours: expiryHours,
      });

      const message = [
        `${activeGym.name} staff invitation`,
        '',
        `Role: ${roleLabel(invite.role)}`,
        invite.email ? `For: ${invite.email}` : null,
        `Code: ${invite.code}`,
        '',
        `This code expires ${new Date(
          invite.expiresAt
        ).toLocaleString()}.`,
        '',
        'Open the Gym Management app and choose "Join existing gym".',
      ]
        .filter(Boolean)
        .join('\n');

      setEmail('');
      await load();

      Alert.alert(
        'Invitation created',
        `Code: ${invite.code}`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => {
              Share.share({ message }).catch(error =>
                console.error('Share failed:', error)
              );
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to create invitation',
        error?.message || 'Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const confirmRoleChange = (
    member: GymStaffMember,
    nextRole: InvitationRole
  ) => {
    if (member.role === nextRole) return;

    Alert.alert(
      'Change staff role?',
      `${member.email || 'This staff member'} will become ${roleLabel(
        nextRole
      )}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change role',
          onPress: async () => {
            try {
              await staffService.updateRole(member.id, nextRole);
              await load();
            } catch (error: any) {
              Alert.alert(
                'Unable to change role',
                error?.message || 'Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const deactivate = (member: GymStaffMember) => {
    Alert.alert(
      'Deactivate staff access?',
      `${member.email || 'This staff member'} will no longer be able to access this gym.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffService.deactivateStaff(member.id);
              await load();
            } catch (error: any) {
              Alert.alert(
                'Unable to deactivate staff',
                error?.message || 'Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const revokeInvite = (invite: StaffInvitation) => {
    Alert.alert(
      'Revoke invitation?',
      'This invitation code will stop working immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffService.revokeInvitation(invite.id);
              await load();
            } catch (error: any) {
              Alert.alert(
                'Unable to revoke invitation',
                error?.message || 'Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading || roleLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading staff access...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{activeGym?.name}</Text>
          <Text style={styles.heroTitle}>Staff & roles</Text>
          <Text style={styles.heroSubtitle}>
            Everyone gets only the access their job requires.
          </Text>
        </View>
      </View>

      <View style={styles.myAccessCard}>
        <View>
          <Text style={styles.sectionEyebrow}>YOUR ACCESS</Text>
          <Text style={styles.myRole}>
            {role ? roleLabel(role) : 'No role'}
          </Text>
          <Text style={styles.permissionDescription}>
            {permissions.description}
          </Text>
        </View>
      </View>

      {permissions.canManageStaff ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Invite staff</Text>
              <Text style={styles.sectionSubtitle}>
                Codes expire automatically and can optionally be locked to an email.
              </Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Role</Text>

          <View style={styles.roleGrid}>
            {allowedInviteRoles.map(item => {
              const selected = selectedRole === item;
              const tint = roleTint[item];

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.roleChoice,
                    selected && {
                      borderColor: tint.fg,
                      backgroundColor: tint.bg,
                    },
                  ]}
                  onPress={() => setSelectedRole(item)}
                >
                  <Text
                    style={[
                      styles.roleChoiceText,
                      selected && { color: tint.fg },
                    ]}
                  >
                    {roleLabel(item)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.roleHelp}>
            {ROLE_PERMISSIONS[selectedRole].description}
          </Text>

          <Text style={styles.inputLabel}>Email (recommended)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="staff@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Expires after</Text>

          <View style={styles.expiryRow}>
            {([24, 48, 72] as const).map(hours => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.expiryChoice,
                  expiryHours === hours && styles.expiryChoiceActive,
                ]}
                onPress={() => setExpiryHours(hours)}
              >
                <Text
                  style={[
                    styles.expiryText,
                    expiryHours === hours && styles.expiryTextActive,
                  ]}
                >
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isCreating && styles.buttonDisabled,
            ]}
            onPress={createInvite}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="paper-plane-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  Create invitation
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Team</Text>
            <Text style={styles.sectionSubtitle}>
              {staff.filter(item => item.status === 'active').length} active staff members
            </Text>
          </View>
        </View>

        {staff.map(member => {
          const tint = roleTint[member.role];
          const manageable =
            permissions.canManageStaff &&
            member.role !== 'owner' &&
            member.status === 'active';

          return (
            <View key={member.id} style={styles.staffRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(member.email || member.role)
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={styles.staffInfo}>
                <Text style={styles.staffEmail}>
                  {member.email || 'Staff account'}
                </Text>

                <View style={styles.staffMeta}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: tint.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: tint.fg },
                      ]}
                    >
                      {roleLabel(member.role)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.statusText,
                      member.status !== 'active' &&
                        styles.statusInactive,
                    ]}
                  >
                    {member.status}
                  </Text>
                </View>

                {manageable ? (
                  <View style={styles.inlineActions}>
                    {allowedInviteRoles
                      .filter(
                        item =>
                          member.role !== 'admin' ||
                          permissions.canInviteAdmin
                      )
                      .map(item => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.miniRole,
                            member.role === item &&
                              styles.miniRoleActive,
                          ]}
                          onPress={() =>
                            confirmRoleChange(member, item)
                          }
                        >
                          <Text
                            style={[
                              styles.miniRoleText,
                              member.role === item &&
                                styles.miniRoleTextActive,
                            ]}
                          >
                            {roleLabel(item)}
                          </Text>
                        </TouchableOpacity>
                      ))}

                    <TouchableOpacity
                      style={styles.deactivateButton}
                      onPress={() => deactivate(member)}
                    >
                      <Ionicons
                        name="person-remove-outline"
                        size={16}
                        color="#B91C1C"
                      />
                      <Text style={styles.deactivateText}>
                        Deactivate
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {permissions.canManageStaff ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent invitations</Text>
              <Text style={styles.sectionSubtitle}>
                Revoke unused codes whenever needed.
              </Text>
            </View>
          </View>

          {invitations.length === 0 ? (
            <Text style={styles.emptyText}>No invitations yet.</Text>
          ) : (
            invitations.slice(0, 12).map(invite => (
              <View key={invite.id} style={styles.inviteRow}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteTitle}>
                    {roleLabel(invite.role)}
                  </Text>
                  <Text style={styles.inviteMeta}>
                    {invite.email || 'Any signed-in user'}
                  </Text>
                  <Text style={styles.inviteMeta}>
                    Expires {new Date(invite.expiresAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.inviteRight}>
                  <Text
                    style={[
                      styles.inviteStatus,
                      invite.status === 'pending' &&
                        styles.invitePending,
                    ]}
                  >
                    {invite.status}
                  </Text>

                  {invite.status === 'pending' ? (
                    <TouchableOpacity
                      onPress={() => revokeInvite(invite)}
                    >
                      <Text style={styles.revokeText}>Revoke</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  hero: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#312E81',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 3,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  myAccessCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  myRole: {
    color: '#1E1B4B',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  permissionDescription: {
    color: '#4F46E5',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 15,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChoice: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  roleChoiceText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  roleHelp: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  expiryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expiryChoice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expiryChoiceActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  expiryText: {
    color: '#64748B',
    fontWeight: '800',
  },
  expiryTextActive: {
    color: '#4338CA',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  staffRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#334155',
    fontSize: 17,
    fontWeight: '900',
  },
  staffInfo: {
    flex: 1,
  },
  staffEmail: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  statusInactive: {
    color: '#B91C1C',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  miniRole: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },
  miniRoleActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#818CF8',
  },
  miniRoleText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  miniRoleTextActive: {
    color: '#4338CA',
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
  },
  deactivateText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 13,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  inviteMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  inviteRight: {
    alignItems: 'flex-end',
    gap: 7,
  },
  inviteStatus: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  invitePending: {
    color: '#B45309',
  },
  revokeText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
});

export default StaffManagementScreen;