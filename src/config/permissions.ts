import type { GymRole, InvitationRole } from '../types/gym';

export interface RolePermissions {
  label: string;
  description: string;
  canManageStaff: boolean;
  canInviteAdmin: boolean;
  canViewAudit: boolean;
  canRecordPayment: boolean;
  canVoidPayment: boolean;
  canManageExpenses: boolean;
  canManageClients: boolean;
  canCheckIn: boolean;
}

export const ROLE_PERMISSIONS: Record<GymRole, RolePermissions> = {
  owner: {
    label: 'Owner',
    description: 'Full control over the gym, staff, finances and settings.',
    canManageStaff: true,
    canInviteAdmin: true,
    canViewAudit: true,
    canRecordPayment: true,
    canVoidPayment: true,
    canManageExpenses: true,
    canManageClients: true,
    canCheckIn: true,
  },
  admin: {
    label: 'Admin',
    description: 'Manages daily operations and staff, except owner/admin authority.',
    canManageStaff: true,
    canInviteAdmin: false,
    canViewAudit: true,
    canRecordPayment: true,
    canVoidPayment: true,
    canManageExpenses: true,
    canManageClients: true,
    canCheckIn: true,
  },
  manager: {
    label: 'Manager',
    description: 'Runs day-to-day gym operations and reporting.',
    canManageStaff: false,
    canInviteAdmin: false,
    canViewAudit: true,
    canRecordPayment: true,
    canVoidPayment: false,
    canManageExpenses: true,
    canManageClients: true,
    canCheckIn: true,
  },
  receptionist: {
    label: 'Reception',
    description: 'Handles members, check-ins and fee collection.',
    canManageStaff: false,
    canInviteAdmin: false,
    canViewAudit: false,
    canRecordPayment: true,
    canVoidPayment: false,
    canManageExpenses: false,
    canManageClients: true,
    canCheckIn: true,
  },
  trainer: {
    label: 'Trainer',
    description: 'Views members and supports training/check-in workflows.',
    canManageStaff: false,
    canInviteAdmin: false,
    canViewAudit: false,
    canRecordPayment: false,
    canVoidPayment: false,
    canManageExpenses: false,
    canManageClients: false,
    canCheckIn: true,
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access without management privileges.',
    canManageStaff: false,
    canInviteAdmin: false,
    canViewAudit: false,
    canRecordPayment: true,
    canVoidPayment: false,
    canManageExpenses: false,
    canManageClients: true,
    canCheckIn: true,
  },
};

export const INVITABLE_ROLES: InvitationRole[] = [
  'admin',
  'manager',
  'receptionist',
  'trainer',
  'staff',
];

export const roleLabel = (role: GymRole | string): string =>
  ROLE_PERMISSIONS[role as GymRole]?.label ?? role;