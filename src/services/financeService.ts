import { supabase } from './supabase';
import type { PaymentMethod } from '../types';
import type {
  ExpenseRecord,FinanceSummary,FinanceTrendPoint,RenewalDueItem
} from '../types/finance';

const expense=(x:any):ExpenseRecord=>({
  id:x.id,description:x.description,amount:Number(x.amount),
  category:x.category||'Other',expenseDate:x.expense_date,
  notes:x.notes??null,status:x.status,
  paymentMethod:(x.payment_method||'cash') as PaymentMethod,
  referenceNumber:x.reference_number??null,
  createdByEmail:x.created_by_email??null,
  voidedAt:x.voided_at??null,voidReason:x.void_reason??null,
});

export const financeService={
  listExpenses:async(gymId:string,includeVoided=false)=>{
    const {data,error}=await supabase.rpc('list_expenses',{
      p_gym_id:gymId,p_include_voided:includeVoided
    });
    if(error) throw error;
    return ((data as any[])??[]).map(expense);
  },

  saveExpense:async(input:{
    gymId:string;expenseId?:string|null;description:string;amount:number;
    category:string;expenseDate:string;paymentMethod:PaymentMethod;
    referenceNumber?:string|null;notes?:string|null;
  })=>{
    const {data,error}=await supabase.rpc('save_expense',{
      p_gym_id:input.gymId,p_expense_id:input.expenseId||null,
      p_description:input.description,p_amount:input.amount,
      p_category:input.category,p_expense_date:input.expenseDate,
      p_payment_method:input.paymentMethod,
      p_reference_number:input.referenceNumber?.trim()||null,
      p_notes:input.notes?.trim()||null,
    });
    if(error) throw error;
    return expense(data);
  },

  voidExpense:async(id:string,reason:string)=>{
    const {error}=await supabase.rpc('void_expense',{
      p_expense_id:id,p_reason:reason
    });
    if(error) throw error;
  },

  getSummary:async(gymId:string,from:string,to:string):Promise<FinanceSummary>=>{
    const {data,error}=await supabase.rpc('get_finance_summary',{
      p_gym_id:gymId,p_from:from,p_to:to
    });
    if(error) throw error;
    const x:any=data||{};
    return {
      revenue:Number(x.revenue||0),expenses:Number(x.expenses||0),net:Number(x.net||0),
      paymentCount:Number(x.payment_count||0),expenseCount:Number(x.expense_count||0),
      expiredMembers:Number(x.expired_members||0),expiring7Days:Number(x.expiring_7_days||0),
      paymentMethods:((x.payment_methods as any[])||[]).map(i=>({
        key:i.key,amount:Number(i.amount||0),count:Number(i.count||0)
      })),
      expenseCategories:((x.expense_categories as any[])||[]).map(i=>({
        key:i.key,amount:Number(i.amount||0),count:Number(i.count||0)
      })),
    };
  },

  getTrend:async(gymId:string,months=6):Promise<FinanceTrendPoint[]>=>{
    const {data,error}=await supabase.rpc('get_finance_monthly_trend',{
      p_gym_id:gymId,p_months:months
    });
    if(error) throw error;
    return ((data as any[])||[]).map(x=>({
      month:x.month,label:x.label,revenue:Number(x.revenue||0),
      expenses:Number(x.expenses||0),net:Number(x.net||0),
    }));
  },

  listRenewalsDue:async(gymId:string,limit=30):Promise<RenewalDueItem[]>=>{
    const {data,error}=await supabase.rpc('list_renewals_due',{
      p_gym_id:gymId,p_limit:limit
    });
    if(error) throw error;
    return ((data as any[])||[]).map(x=>({
      clientId:x.client_id,name:x.name,phone:x.phone??null,
      dueDate:x.due_date,daysDelta:Number(x.days_delta||0),state:x.state,
    }));
  },
};