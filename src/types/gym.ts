export interface Gym {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
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
  role: keyof GymUserRole | string;
  status: 'active' | 'pending' | 'inactive';
  createdAt?: string;
  gym?: Gym;
}
