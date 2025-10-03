/**
 * Usage:
 *  SUPABASE_URL=https://your.supabase.url SUPABASE_SERVICE_KEY=your_service_role_key node scripts/trigger_payment.js
 *
 * This script inserts a test payment row into the `payments` table to trigger Supabase realtime listeners.
 */

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const now = new Date().toISOString().split('T')[0];
    const payment = {
      clientId: 'test-client-id',
      clientName: 'Test Client',
      amount: 1000,
      paymentDate: now,
      dueDate: now,
      status: 'Paid',
    };

    const { data, error } = await supabase.from('payments').insert([payment]);
    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }

    console.log('Inserted payment:', data);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
