export type AttendanceSource = 'manual' | 'qr';

export type AttendanceMembershipState =
  | 'active'
  | 'frozen'
  | 'expired'
  | 'inactive';

export interface AttendanceMember {
  id: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
  qrToken: string;
  membershipDueDate?: string | null;
  membershipStatus: AttendanceMembershipState;
  canCheckIn: boolean;
  isCheckedIn: boolean;
}

export interface AttendanceVisit {
  id: string;
  clientId: string;
  clientName: string;
  phone?: string | null;
  photoUrl?: string | null;
  checkInAt: string;
  checkOutAt?: string | null;
  source: AttendanceSource;
  membershipId?: string | null;
}

export interface AttendanceSummary {
  todayCount: number;
  insideCount: number;
  uniqueMembers: number;
  peakHour?: number | null;
  timezone: string;
}

export interface CheckInResult {
  attendance: {
    id: string;
    gym_id: string;
    client_id: string;
    membership_id?: string | null;
    check_in_at: string;
    check_out_at?: string | null;
    source: AttendanceSource;
  };
  client: {
    id: string;
    name: string;
    phone?: string | null;
    photo_url?: string | null;
  };
  duplicate: boolean;
  message: string;
}

export interface AttendanceHistoryItem {
  id: string;
  checkInAt: string;
  checkOutAt?: string | null;
  source: AttendanceSource;
}