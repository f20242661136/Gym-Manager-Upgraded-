import { NavigatorScreenParams } from '@react-navigation/native';

export type ClientStackParamList = {
  ClientsList: undefined;
  ClientDetail: { clientId: string };
  AddClient: { client?: any; isEditing?: boolean };
};

export type PaymentStackParamList = {
  PaymentsList: { clientId?: string; clientName?: string };
  AddPayment: { clientId: string; clientName: string };
};

export type RootTabParamList = {
  Dashboard: undefined;
  Clients: NavigatorScreenParams<ClientStackParamList>;
  Payments: NavigatorScreenParams<PaymentStackParamList>;
  Notifications: undefined;
  GymManagement: undefined;
  JoinGym: undefined;
  Settings: undefined;
};
