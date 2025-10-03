export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  chest: number;
  waist: number;
  bmi: number;
  photoUrl: string;
  membershipStatus: 'Paid' | 'Unpaid';
  registrationDate: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  dueDate: string;
  status: 'Paid' | 'Pending';
}

export interface DashboardStats {
  totalClients: number;
  paidClients: number;
  unpaidClients: number;
}