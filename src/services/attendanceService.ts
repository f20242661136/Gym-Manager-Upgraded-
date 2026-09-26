import { supabase } from './supabase';
import type {
  AttendanceHistoryItem,
  AttendanceMember,
  AttendanceSummary,
  AttendanceVisit,
  CheckInResult,
} from '../types/attendance';

const mapMember = (item: any): AttendanceMember => ({
  id: item.id,
  name: item.name,
  phone: item.phone ?? null,
  photoUrl: item.photo_url ?? null,
  qrToken: item.qr_token,
  membershipDueDate: item.membership_due_date ?? null,
  membershipStatus: item.membership_status,
  canCheckIn: Boolean(item.can_check_in),
  isCheckedIn: Boolean(item.is_checked_in),
});

const mapVisit = (item: any): AttendanceVisit => ({
  id: item.id,
  clientId: item.client_id,
  clientName: item.client_name,
  phone: item.phone ?? null,
  photoUrl: item.photo_url ?? null,
  checkInAt: item.check_in_at,
  checkOutAt: item.check_out_at ?? null,
  source: item.source,
  membershipId: item.membership_id ?? null,
});

export const attendanceService = {
  searchMembers: async (
    gymId: string,
    query = ''
  ): Promise<AttendanceMember[]> => {
    const { data, error } = await supabase.rpc(
      'search_attendance_clients',
      {
        p_gym_id: gymId,
        p_query: query.trim(),
      }
    );

    if (error) throw error;

    return ((data as any[]) ?? []).map(mapMember);
  },

  listToday: async (
    gymId: string
  ): Promise<AttendanceVisit[]> => {
    const { data, error } = await supabase.rpc(
      'list_today_attendance',
      {
        p_gym_id: gymId,
      }
    );

    if (error) throw error;

    return ((data as any[]) ?? []).map(mapVisit);
  },

  getSummary: async (
    gymId: string
  ): Promise<AttendanceSummary> => {
    const { data, error } = await supabase.rpc(
      'get_attendance_summary',
      {
        p_gym_id: gymId,
      }
    );

    if (error) throw error;

    const value: any = data ?? {};

    return {
      todayCount: Number(value.today_count ?? 0),
      insideCount: Number(value.inside_count ?? 0),
      uniqueMembers: Number(value.unique_members ?? 0),
      peakHour:
        value.peak_hour === null ||
        value.peak_hour === undefined
          ? null
          : Number(value.peak_hour),
      timezone: value.timezone ?? 'Asia/Karachi',
    };
  },

  checkIn: async (
    gymId: string,
    clientId: string
  ): Promise<CheckInResult> => {
    const { data, error } = await supabase.rpc(
      'check_in_client',
      {
        p_gym_id: gymId,
        p_client_id: clientId,
        p_source: 'manual',
      }
    );

    if (error) throw error;

    return data as CheckInResult;
  },

  checkInByQr: async (
    gymId: string,
    qrToken: string
  ): Promise<CheckInResult> => {
    const { data, error } = await supabase.rpc(
      'check_in_by_qr',
      {
        p_gym_id: gymId,
        p_qr_token: qrToken,
      }
    );

    if (error) throw error;

    return data as CheckInResult;
  },

  checkOut: async (
    attendanceId: string
  ): Promise<void> => {
    const { error } = await supabase.rpc(
      'check_out_attendance',
      {
        p_attendance_id: attendanceId,
      }
    );

    if (error) throw error;
  },

  getHistory: async (
    gymId: string,
    clientId: string,
    limit = 50
  ): Promise<AttendanceHistoryItem[]> => {
    const { data, error } = await supabase.rpc(
      'get_client_attendance_history',
      {
        p_gym_id: gymId,
        p_client_id: clientId,
        p_limit: limit,
      }
    );

    if (error) throw error;

    return ((data as any[]) ?? []).map((item: any) => ({
      id: item.id,
      checkInAt: item.check_in_at,
      checkOutAt: item.check_out_at ?? null,
      source: item.source,
    }));
  },
};