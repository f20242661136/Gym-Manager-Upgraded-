import { supabase } from './supabase';
import type {
  AuditLogEntry,
  GymRole,
  GymStaffMember,
  InvitationRole,
  StaffInvitation,
} from '../types/gym';
import type { Gym } from '../types/gym';

const mapGym = (gym: any): Gym => ({
  id: gym.id,
  name: gym.name,
  slug: gym.slug,
  logoUrl: gym.logo_url ?? null,
  phone: gym.phone ?? null,
  email: gym.email ?? null,
  address: gym.address ?? null,
  countryCode: gym.country_code === 'IN' ? 'IN' : 'PK',
  currencyCode: gym.currency_code === 'INR' ? 'INR' : 'PKR',
  timezone:
    gym.timezone ??
    (gym.country_code === 'IN' ? 'Asia/Kolkata' : 'Asia/Karachi'),
  locale:
    gym.locale ??
    (gym.country_code === 'IN' ? 'en-IN' : 'en-PK'),
  joinCode: gym.join_code ?? null,
  status: gym.status,
  createdAt: gym.created_at,
  updatedAt: gym.updated_at,
});

export const staffService = {
  getMyRole: async (gymId: string): Promise<GymRole | null> => {
    const { data, error } = await supabase.rpc('get_my_gym_role', {
      p_gym_id: gymId,
    });

    if (error) throw error;
    return (data as GymRole | null) ?? null;
  },

  listStaff: async (gymId: string): Promise<GymStaffMember[]> => {
    const { data, error } = await supabase.rpc('list_gym_staff', {
      p_gym_id: gymId,
    });

    if (error) throw error;

    return ((data as any[]) ?? []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      email: item.email ?? null,
      role: item.role,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  createInvitation: async (input: {
    gymId: string;
    role: InvitationRole;
    email?: string | null;
    expiresHours?: number;
  }): Promise<{
    id: string;
    code: string;
    role: InvitationRole;
    email?: string | null;
    expiresAt: string;
  }> => {
    const { data, error } = await supabase.rpc('create_staff_invitation', {
      p_gym_id: input.gymId,
      p_role: input.role,
      p_email: input.email?.trim() || null,
      p_expires_hours: input.expiresHours ?? 48,
    });

    if (error) throw error;

    const result: any = data;

    return {
      id: result.id,
      code: result.code,
      role: result.role,
      email: result.email ?? null,
      expiresAt: result.expires_at,
    };
  },

  listInvitations: async (gymId: string): Promise<StaffInvitation[]> => {
    const { data, error } = await supabase.rpc('list_staff_invitations', {
      p_gym_id: gymId,
    });

    if (error) throw error;

    return ((data as any[]) ?? []).map((item: any) => ({
      id: item.id,
      email: item.email ?? null,
      role: item.role,
      expiresAt: item.expires_at,
      acceptedAt: item.accepted_at ?? null,
      revokedAt: item.revoked_at ?? null,
      createdAt: item.created_at,
      status: item.status,
    }));
  },

  acceptInvitation: async (code: string): Promise<Gym> => {
    const { data, error } = await supabase.rpc('accept_staff_invitation', {
      p_code: code.trim().toUpperCase(),
    });

    if (error) throw error;
    if (!data) throw new Error('Invitation could not be accepted.');

    return mapGym(data);
  },

  revokeInvitation: async (invitationId: string): Promise<void> => {
    const { error } = await supabase.rpc('revoke_staff_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) throw error;
  },

  updateRole: async (
    gymUserId: string,
    role: InvitationRole
  ): Promise<void> => {
    const { error } = await supabase.rpc('update_staff_role', {
      p_gym_user_id: gymUserId,
      p_role: role,
    });

    if (error) throw error;
  },

  deactivateStaff: async (gymUserId: string): Promise<void> => {
    const { error } = await supabase.rpc('deactivate_staff_member', {
      p_gym_user_id: gymUserId,
    });

    if (error) throw error;
  },

  listAuditLogs: async (
    gymId: string,
    limit = 100
  ): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase.rpc('list_audit_logs', {
      p_gym_id: gymId,
      p_limit: limit,
    });

    if (error) throw error;

    return ((data as any[]) ?? []).map((item: any) => ({
      id: item.id,
      actorUserId: item.actor_user_id ?? null,
      actorEmail: item.actor_email ?? null,
      action: item.action,
      entityType: item.entity_type,
      entityId: item.entity_id ?? null,
      oldValue: item.old_value ?? null,
      newValue: item.new_value ?? null,
      metadata: item.metadata ?? null,
      createdAt: item.created_at,
    }));
  },

  voidPayment: async (
    paymentId: string,
    reason: string
  ): Promise<any> => {
    const { data, error } = await supabase.rpc('void_payment', {
      p_payment_id: paymentId,
      p_reason: reason.trim(),
    });

    if (error) throw error;
    return data;
  },
};