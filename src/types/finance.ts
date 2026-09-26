import type { PaymentMethod } from './index';

export interface ExpenseRecord {
  id:string;
  description:string;
  amount:number;
  category:string;
  expenseDate:string;
  notes?:string|null;
  status:'active'|'voided';
  paymentMethod:PaymentMethod;
  referenceNumber?:string|null;
  createdByEmail?:string|null;
  voidedAt?:string|null;
  voidReason?:string|null;
}

export interface FinanceBreakdownItem {
  key:string;
  amount:number;
  count:number;
}

export interface FinanceSummary {
  revenue:number;
  expenses:number;
  net:number;
  paymentCount:number;
  expenseCount:number;
  expiredMembers:number;
  expiring7Days:number;
  paymentMethods:FinanceBreakdownItem[];
  expenseCategories:FinanceBreakdownItem[];
}

export interface FinanceTrendPoint {
  month:string;
  label:string;
  revenue:number;
  expenses:number;
  net:number;
}

export interface RenewalDueItem {
  clientId:string;
  name:string;
  phone?:string|null;
  dueDate:string;
  daysDelta:number;
  state:'expired'|'expiring';
}