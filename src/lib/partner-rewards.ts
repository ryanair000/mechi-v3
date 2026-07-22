import 'server-only';

import { createHash, randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSignedActionHeaders, getChezahubBaseUrl } from '@/lib/rewards';

export const CHEZA_CREDIT_RATE_RP_PER_KES = 10;
export const CHEZA_CREDIT_RATE_VERSION = '2026-07-v1';
export const CHEZA_CREDIT_PERIOD_LIMIT_KES = 500;
export const CHEZA_CREDIT_DAILY_LIMIT = 3;
export const CHEZA_CREDIT_VOUCHER_HOURS = 72;

function monthlyBudgetKes() {
  const configured = Number(process.env.CHEZA_CREDIT_MONTHLY_BUDGET_KES ?? 50_000);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 50_000;
}

export const CHEZA_CREDIT_PACKAGES = [
  { rp: 500, creditKes: 50, label: 'Starter Credit' },
  { rp: 1_000, creditKes: 100, label: 'Player Credit' },
  { rp: 2_500, creditKes: 250, label: 'Pro Credit' },
  { rp: 5_000, creditKes: 500, label: 'Elite Credit' },
] as const;

export type PartnerRewardExportStatus =
  | 'reserved'
  | 'review'
  | 'issued'
  | 'redeemed'
  | 'completed'
  | 'expired'
  | 'voided'
  | 'restored'
  | 'rejected'
  | 'reconciliation_required';

export interface PartnerRewardExport {
  id: string;
  user_id: string;
  rp_amount: number;
  credit_kes: number;
  rate_version: string;
  status: PartnerRewardExportStatus;
  idempotency_key: string;
  external_voucher_id: string | null;
  external_wallet_transaction_id: string | null;
  chezahub_user_id: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  completed_at: string | null;
  restored_at: string | null;
  risk_status: 'clear' | 'hold' | 'review' | 'deny';
  risk_reasons: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChezahubVoucherStatus {
  id: string;
  partner_export_id: string;
  partner_user_id: string;
  bound_user_id: string | null;
  credit_kes: number;
  rp_amount: number;
  rate_version: string;
  status: 'issued' | 'redeemed' | 'expired' | 'voided' | 'review';
  expires_at: string;
  redeemed_at: string | null;
  wallet_transaction_id: string | null;
  redeem_url?: string | null;
  display_code?: string | null;
}

function getBridgeEndpoint(route: string) {
  return `${getChezahubBaseUrl()}/api/mechi?route=${encodeURIComponent(route)}`;
}

function bridgeEnabled() {
  return String(process.env.CHEZA_CREDIT_REDEMPTION_ENABLED ?? '').toLowerCase() === 'true';
}

export function assertChezaCreditBridgeEnabled() {
  if (!bridgeEnabled()) {
    throw new Error('Cheza Credit redemption is not enabled');
  }
}

export function getChezaCreditPackage(rpAmount: number) {
  return CHEZA_CREDIT_PACKAGES.find((item) => item.rp === rpAmount) ?? null;
}

export async function reserveChezaCreditExport(
  supabase: SupabaseClient,
  params: {
    userId: string;
    rpAmount: number;
    idempotencyKey: string;
    chezahubUserId?: string | null;
    riskStatus?: 'clear' | 'hold' | 'review' | 'deny';
    riskReasons?: string[];
  }
) {
  const rewardPackage = getChezaCreditPackage(params.rpAmount);
  if (!rewardPackage) throw new Error('Select an approved Cheza Credit package');

  const expiresAt = new Date(Date.now() + CHEZA_CREDIT_VOUCHER_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('reserve_chezahub_credit_export', {
    p_user_id: params.userId,
    p_rp_amount: rewardPackage.rp,
    p_credit_kes: rewardPackage.creditKes,
    p_rate: CHEZA_CREDIT_RATE_RP_PER_KES,
    p_rate_version: CHEZA_CREDIT_RATE_VERSION,
    p_idempotency_key: params.idempotencyKey,
    p_period_limit_kes: CHEZA_CREDIT_PERIOD_LIMIT_KES,
    p_daily_limit: CHEZA_CREDIT_DAILY_LIMIT,
    p_monthly_budget_kes: monthlyBudgetKes(),
    p_expires_at: expiresAt,
    p_chezahub_user_id: params.chezahubUserId ?? null,
    p_risk_status: params.riskStatus ?? 'clear',
    p_risk_reasons: params.riskReasons ?? [],
    p_metadata: { source: 'playmechi_v5', chezahub_user_id: params.chezahubUserId ?? null },
  });
  if (error) throw error;
  return data as PartnerRewardExport & { idempotent?: boolean };
}

async function signedBridgeRequest<T>(route: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(getBridgeEndpoint(route), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...createSignedActionHeaders(payload) },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    const error = new Error(data?.error || `ChezaHub bridge request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return data;
}

export async function issueChezaCreditVoucher(rewardExport: PartnerRewardExport) {
  const payload = {
    request_id: randomUUID(),
    mechi_export_id: rewardExport.id,
    mechi_user_id: rewardExport.user_id,
    chezahub_user_id: rewardExport.chezahub_user_id,
    rp_amount: rewardExport.rp_amount,
    credit_kes: Number(rewardExport.credit_kes),
    rate_version: rewardExport.rate_version,
    expires_at: rewardExport.expires_at,
  };
  return signedBridgeRequest<{
    voucher_id: string;
    status: string;
    redeem_url: string;
    display_code: string;
    expires_at: string;
  }>('credit-voucher-create', payload);
}

export async function getChezaCreditVoucherStatus(exportId: string) {
  const payload = { request_id: randomUUID(), mechi_export_id: exportId };
  const result = await signedBridgeRequest<{ voucher: ChezahubVoucherStatus }>('credit-voucher-status', payload);
  return result.voucher;
}

export async function voidChezaCreditVoucher(exportId: string, reason: string) {
  const payload = { request_id: randomUUID(), mechi_export_id: exportId, reason: reason.slice(0, 500) };
  return signedBridgeRequest<{ voucher_id: string; status: string; idempotent?: boolean }>('credit-voucher-void', payload);
}

export async function markChezaCreditVoucherIssued(
  supabase: SupabaseClient,
  exportId: string,
  voucher: { voucher_id: string; expires_at: string }
) {
  const { data, error } = await supabase
    .from('partner_reward_exports')
    .update({
      status: 'issued',
      external_voucher_id: voucher.voucher_id,
      expires_at: voucher.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exportId)
    .in('status', ['reserved', 'issued'])
    .select('*')
    .single();
  if (error) throw error;
  return data as PartnerRewardExport;
}

export async function restoreChezaCreditExport(
  supabase: SupabaseClient,
  exportId: string,
  reason: string,
  externalStatus: 'voided' | 'expired' | 'not_issued'
) {
  const { data, error } = await supabase.rpc('restore_chezahub_credit_export', {
    p_export_id: exportId,
    p_reason: reason,
    p_external_status: externalStatus,
  });
  if (error) throw error;
  return data as PartnerRewardExport & { idempotent?: boolean };
}

export function fingerprintCallbackPayload(payload: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(payload, Object.keys(payload).sort())).digest('hex');
}

export async function reconcileChezaCreditExport(supabase: SupabaseClient, rewardExport: PartnerRewardExport) {
  if (['completed', 'restored', 'rejected'].includes(rewardExport.status)) {
    return { export: rewardExport, action: 'none' as const };
  }

  try {
    const voucher = await getChezaCreditVoucherStatus(rewardExport.id);
    if (voucher.status === 'issued') {
      const updated = await markChezaCreditVoucherIssued(supabase, rewardExport.id, {
        voucher_id: voucher.id,
        expires_at: voucher.expires_at,
      });
      return { export: updated, voucher, action: 'issued' as const };
    }
    if (voucher.status === 'redeemed') {
      if (!voucher.wallet_transaction_id || !voucher.bound_user_id || !voucher.redeemed_at) {
        throw new Error('Redeemed voucher is missing settlement references');
      }
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('partner_reward_exports')
        .update({
          status: 'completed',
          external_voucher_id: voucher.id,
          external_wallet_transaction_id: voucher.wallet_transaction_id,
          chezahub_user_id: voucher.bound_user_id,
          redeemed_at: voucher.redeemed_at,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', rewardExport.id)
        .select('*')
        .single();
      if (error) throw error;
      await supabase.from('profiles').update({
        chezahub_user_id: voucher.bound_user_id,
        chezahub_linked_at: now,
      }).eq('id', rewardExport.user_id).or(`chezahub_user_id.is.null,chezahub_user_id.eq.${voucher.bound_user_id}`);
      return { export: data as PartnerRewardExport, voucher, action: 'completed' as const };
    }
    if (voucher.status === 'expired' || voucher.status === 'voided') {
      const restored = await restoreChezaCreditExport(supabase, rewardExport.id, `Partner status: ${voucher.status}`, voucher.status);
      return { export: restored, voucher, action: 'restored' as const };
    }
    return { export: rewardExport, voucher, action: 'review' as const };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 404 && rewardExport.status === 'reserved') {
      const voucher = await issueChezaCreditVoucher(rewardExport);
      const updated = await markChezaCreditVoucherIssued(supabase, rewardExport.id, voucher);
      return { export: updated, voucher, action: 'issued' as const };
    }
    throw error;
  }
}

export async function reconcilePendingChezaCreditExports(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from('partner_reward_exports')
    .select('*')
    .in('status', ['reserved', 'issued', 'redeemed', 'reconciliation_required'])
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;

  const results: Array<{ id: string; action: string; error?: string }> = [];
  for (const row of (data ?? []) as PartnerRewardExport[]) {
    try {
      const result = await reconcileChezaCreditExport(supabase, row);
      results.push({ id: row.id, action: result.action });
    } catch (itemError) {
      const message = itemError instanceof Error ? itemError.message : 'Unknown reconciliation error';
      await supabase.from('partner_reward_exports').update({
        status: 'reconciliation_required',
        updated_at: new Date().toISOString(),
        metadata: { ...(row.metadata ?? {}), reconciliation_error: message },
      }).eq('id', row.id).neq('status', 'completed');
      results.push({ id: row.id, action: 'error', error: message });
    }
  }
  return results;
}
