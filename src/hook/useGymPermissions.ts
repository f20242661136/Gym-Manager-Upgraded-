import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGym } from '../contexts/GymContext';
import { staffService } from '../services/staffService';
import {
  ROLE_PERMISSIONS,
  type RolePermissions,
} from '../config/permissions';
import type { GymRole } from '../types/gym';

const EMPTY_PERMISSIONS: RolePermissions = {
  label: 'No access',
  description: 'No active gym membership.',
  canManageStaff: false,
  canInviteAdmin: false,
  canViewAudit: false,
  canRecordPayment: false,
  canVoidPayment: false,
  canManageExpenses: false,
  canManageClients: false,
  canCheckIn: false,
};

export const useGymPermissions = () => {
  const { activeGymId } = useGym();
  const [role, setRole] = useState<GymRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeGymId) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const nextRole = await staffService.getMyRole(activeGymId);
      setRole(nextRole);
    } catch (error) {
      console.error('Failed to load gym permissions:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const permissions = useMemo(
    () => (role ? ROLE_PERMISSIONS[role] : EMPTY_PERMISSIONS),
    [role]
  );

  return {
    role,
    permissions,
    isLoading,
    refresh,
  };
};