import type { CountryCode, CurrencyCode } from './index';

export type GymRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'trainer'
  | 'staff';

export interface Gym {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  countryCode: CountryCode;
  currencyCode: CurrencyCode;
  timezone: string;
  locale: string;
  joinCode?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface GymUserRole {
  owner: 'owner';
  admin: 'admin';
  manager: 'manager';
  staff: 'staff';
  trainer: 'trainer';
  receptionist: 'receptionist';
}

export interface GymMembership {
  id: string;
  gymId: string;
  userId: string;
  role: GymRole;
  status: 'active' | 'pending' | 'inactive';
  createdAt?: string;
  gym?: Gym;
}

export interface GymStaffMember {
  id: string;
  userId: string;
  email?: string | null;
  role: GymRole;
  status: 'active' | 'pending' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type InvitationRole = Exclude<GymRole, 'owner'>;

export interface StaffInvitation {
  id: string;
  email?: string | null;
  role: InvitationRole;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

export interface AuditLogEntry {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}