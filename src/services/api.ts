import { Client, Payment, DashboardStats } from '../types';

// Mock data - in real app, this would be API calls to your backend
const mockClients: Client[] = [
  {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    age: 28,
    gender: 'Male',
    weight: 75,
    height: 180,
    chest: 95,
    waist: 80,
    bmi: 23.1,
    photoUrl: '',
    membershipStatus: 'Paid',
    registrationDate: '2024-01-15'
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '+1234567891',
    email: 'jane@example.com',
    age: 25,
    gender: 'Female',
    weight: 60,
    height: 165,
    chest: 85,
    waist: 70,
    bmi: 22.0,
    photoUrl: '',
    membershipStatus: 'Unpaid',
    registrationDate: '2024-01-20'
  }
];

const mockPayments: Payment[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'John Doe',
    amount: 50,
    paymentDate: '2024-01-15',
    dueDate: '2024-02-15',
    status: 'Paid'
  }
];

export const api = {
  // Client APIs
  getClients: async (): Promise<Client[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockClients;
  },

  getClient: async (id: string): Promise<Client | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockClients.find(client => client.id === id);
  },

  addClient: async (client: Omit<Client, 'id'>): Promise<Client> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newClient: Client = {
      ...client,
      id: Date.now().toString()
    };
    mockClients.push(newClient);
    return newClient;
  },

  updateClient: async (id: string, client: Client): Promise<Client> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const index = mockClients.findIndex(c => c.id === id);
    if (index !== -1) {
      mockClients[index] = client;
    }
    return client;
  },

  deleteClient: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockClients.findIndex(client => client.id === id);
    if (index !== -1) {
      mockClients.splice(index, 1);
    }
  },

  // Payment APIs
  getPayments: async (clientId?: string): Promise<Payment[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (clientId) {
      return mockPayments.filter(payment => payment.clientId === clientId);
    }
    return mockPayments;
  },

  addPayment: async (payment: Omit<Payment, 'id'>): Promise<Payment> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString()
    };
    mockPayments.push(newPayment);
    return newPayment;
  },

  // Dashboard APIs
  getDashboardStats: async (): Promise<DashboardStats> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      totalClients: mockClients.length,
      paidClients: mockClients.filter(c => c.membershipStatus === 'Paid').length,
      unpaidClients: mockClients.filter(c => c.membershipStatus === 'Unpaid').length
    };
  }
};