import { supabase } from './supabase';

export interface PaymentPlanChoice {
  id: string;
  name: string;
  price: number;
  admissionFee: number;
  durationDays: number;
}

export interface PaymentMembershipContext {
  hasMembershipHistory: boolean;
  latestEndDate: string | null;
}

export interface RecordMembershipPaymentInput {
  gymId: string;
  clientId: string;
  planId: string;
  amount: number;
  admissionFee: number;
  discountAmount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
  idempotencyKey: string;
  paymentDate: string;
  startDate: string;
  planDurationDays: number;
}

const randomKey = () => {
  const bytes = new Uint8Array(16);
  const cryptoObject =
    (globalThis as any).crypto;

  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes)
    .map(value =>
      value.toString(16).padStart(2, '0')
    )
    .join('');
};

export const newPaymentIdempotencyKey =
  () =>
    `mobile-${Date.now()}-${randomKey()}`;

const paymentFlowService = {
  listPlans: async (
    gymId: string
  ): Promise<PaymentPlanChoice[]> => {
    const { data, error } =
      await supabase
        .from('plans')
        .select('*')
        .eq('gym_id', gymId)
        .order('price', {
          ascending: true,
        });

    if (error) throw error;

    return ((data as any[]) || [])
      .filter(
        item =>
          item.is_active !== false
      )
      .map(item => ({
        id: item.id,
        name: item.name,
        price: Number(
          item.price || 0
        ),
        admissionFee: Number(
          item.admission_fee || 0
        ),
        durationDays: Number(
          item.duration_days || 0
        ),
      }));
  },

  getMembershipContext: async (
    gymId: string,
    clientId: string
  ): Promise<PaymentMembershipContext> => {
    const { data, error } =
      await supabase
        .from('memberships')
        .select(
          'id,end_date,status,created_at'
        )
        .eq('gym_id', gymId)
        .eq('client_id', clientId)
        .order('end_date', {
          ascending: false,
        })
        .limit(25);

    if (error) throw error;

    const rows =
      (data as any[]) || [];

    const latest =
      rows.find(
        item =>
          item.status !== 'cancelled'
      ) || null;

    return {
      hasMembershipHistory:
        rows.length > 0,
      latestEndDate:
        latest?.end_date || null,
    };
  },

  recordPayment: async (
    input: RecordMembershipPaymentInput
  ): Promise<any> => {
    const {
      gymId,
      clientId,
      planId,
      amount,
      admissionFee,
      discountAmount,
      paymentMethod,
      referenceNumber,
      notes,
      idempotencyKey,
      paymentDate,
      startDate,
      planDurationDays,
    } = input;

    const { data, error } =
      await (supabase as any).rpc(
        'record_membership_payment',
        {
          p_gym_id: gymId,
          p_client_id: clientId,
          p_plan_id: planId,

          p_payment_method:
            paymentMethod === 'bank'
              ? 'bank_transfer'
              : paymentMethod,

          p_discount_amount:
            discountAmount,

          p_reference_number:
            referenceNumber || null,

          p_notes:
            notes || null,

          p_idempotency_key:
            idempotencyKey,

          p_apply_admission_fee:
            admissionFee > 0,
        }
      );

    if (error) throw error;

    return data;
  },
};

export default paymentFlowService;