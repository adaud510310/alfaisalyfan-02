import { supabase } from './supabase';

export async function getMembershipForUser(userId) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, membership_tiers(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWalletVouchers(userId) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('wallet_vouchers')
    .select('*')
    .eq('user_id', userId)
    .order('expires_at');

  if (error) throw error;
  return data;
}

export async function getLoyaltyPoints(userId) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('points')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).reduce((total, entry) => total + entry.points, 0);
}
