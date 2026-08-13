import 'server-only';

import { createHmac, randomInt } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { createServiceClient } from '@/lib/supabase';
import { openPassportSecret } from '@/lib/passport-secret-box';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

type TriggerSource = 'cron' | 'admin' | 'test';
type ClaimedDelivery = {
  delivery_id: string;
  subscription_id: string;
  ecosystem_event_id: string;
  delivery_attempt: number;
  owner_user_id: string;
  endpoint_url: string;
  encrypted_signing_secret: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  event_occurred_at: string;
};

type DeliveryResult = { outcome: 'delivered' | 'retry' | 'failed'; responseStatus: number | null; excerpt: string | null; errorCode: string | null; durationMs: number };

function isPublicIpv4(address: string) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIpv6(address: string) {
  const value = address.toLowerCase();
  if (value.startsWith('::ffff:')) return isPublicIpv4(value.slice(7));
  if (value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('ff')) return false;
  if (value.startsWith('2001:db8:')) return false;
  const first = Number.parseInt(value.split(':')[0] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff;
}

export function isPublicWebhookAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? isPublicIpv4(address) : family === 6 ? isPublicIpv6(address) : false;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorCode: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(errorCode)), timeoutMs); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolvePublicTarget(endpoint: URL) {
  const hostname = endpoint.hostname.replace(/^\[|\]$/g, '');
  const directFamily = isIP(hostname);
  const addresses = directFamily ? [{ address: hostname, family: directFamily }] : await withTimeout(lookup(hostname, { all: true, verbatim: true }), 3000, 'dns_timeout');
  if (!addresses.length || addresses.some(({ address }) => !isPublicWebhookAddress(address))) throw new Error('target_not_public');
  return { hostname, address: addresses[0].address, family: addresses[0].family };
}

function compactResponse(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
}

async function postSignedWebhook(delivery: ClaimedDelivery, body: string, signature: string, timestamp: string): Promise<DeliveryResult> {
  const startedAt = Date.now();
  try {
    const endpoint = new URL(delivery.endpoint_url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port) throw new Error('endpoint_invalid');
    const target = await resolvePublicTarget(endpoint);
    const requestTimeoutMs = Math.max(1000, 10_000 - (Date.now() - startedAt));
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;
      let settled = false;
      const finishReject = (error: Error) => { if (!settled) { settled = true; reject(error); } };
      const req = httpsRequest({
        protocol: 'https:', hostname: target.hostname, servername: target.hostname, path: `${endpoint.pathname}${endpoint.search}`,
        method: 'POST', family: target.family, lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
        headers: {
          'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'Mechi-Passport-Webhooks/1.0',
          'idempotency-key': delivery.ecosystem_event_id,
          'x-mechi-event-id': delivery.ecosystem_event_id, 'x-mechi-delivery-id': delivery.delivery_id,
          'x-mechi-webhook-timestamp': timestamp, 'x-mechi-webhook-signature': `v1=${signature}`,
        },
      }, (res) => {
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > 8192) { req.destroy(new Error('response_too_large')); return; }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (!settled) { settled = true; resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }); }
        });
      });
      const timer = setTimeout(() => req.destroy(new Error('request_timeout')), requestTimeoutMs);
      req.once('close', () => clearTimeout(timer));
      req.once('error', finishReject);
      req.end(body);
    });
    const delivered = response.status >= 200 && response.status < 300;
    const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    return { outcome: delivered ? 'delivered' : retryable ? 'retry' : 'failed', responseStatus: response.status || null, excerpt: compactResponse(response.body), errorCode: delivered ? null : `http_${response.status || 'invalid'}`, durationMs: Date.now() - startedAt };
  } catch (error) {
    const code = error instanceof Error ? error.message.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : 'network_error';
    const retryable = code !== 'target_not_public' && code !== 'endpoint_invalid' && code !== 'response_too_large';
    return { outcome: retryable ? 'retry' : 'failed', responseStatus: null, excerpt: null, errorCode: code || 'network_error', durationMs: Date.now() - startedAt };
  }
}

export function webhookRetryAt(attempt: number, now = Date.now()) {
  const delays = [60, 300, 1800, 7200, 28800, 86400, 172800];
  const baseSeconds = delays[Math.min(Math.max(attempt - 1, 0), delays.length - 1)];
  const jitterPercent = randomInt(80, 121) / 100;
  return new Date(now + baseSeconds * jitterPercent * 1000).toISOString();
}

async function processClaim(delivery: ClaimedDelivery) {
  let result: DeliveryResult;
  try {
    const secret = openPassportSecret(delivery.encrypted_signing_secret, `passport-webhook:${delivery.owner_user_id}:${delivery.endpoint_url}`);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      id: delivery.ecosystem_event_id,
      type: delivery.event_type,
      occurred_at: delivery.event_occurred_at,
      attempt: delivery.delivery_attempt,
      data: delivery.event_payload,
    });
    const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    result = await postSignedWebhook(delivery, body, signature, timestamp);
  } catch {
    result = { outcome: 'failed', responseStatus: null, excerpt: null, errorCode: 'secret_decryption_failed', durationMs: 0 };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('finalize_passport_webhook_delivery', {
    p_delivery_id: delivery.delivery_id,
    p_outcome: result.outcome,
    p_response_status: result.responseStatus,
    p_response_excerpt: result.excerpt,
    p_duration_ms: result.durationMs,
    p_error_code: result.errorCode,
    p_retry_at: result.outcome === 'retry' ? webhookRetryAt(delivery.delivery_attempt) : null,
  });
  if (error) throw new Error('delivery_finalize_failed');
  return String(data ?? result.outcome);
}

async function runWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;
  async function worker() { while (cursor < items.length) { const index = cursor++; results[index] = await task(items[index]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function deliverPassportWebhooks(triggerSource: TriggerSource, batchSize = 12) {
  const feature = getPassportFeatureAccess('webhook_delivery');
  if (!feature.enabled) return { ok: false, disabled: true, claimed: 0, delivered: 0, retried: 0, failed: 0, error: feature.reason };
  const supabase = createServiceClient();
  const { data: run, error: runError } = await supabase.from('passport_operation_runs').insert({ operation_type: 'webhook_delivery', trigger_source: triggerSource }).select('id').single();
  if (runError || !run) throw new Error('Could not start Passport webhook operation');
  try {
    const { data, error } = await supabase.rpc('claim_passport_webhook_deliveries', { p_batch_size: Math.max(1, Math.min(batchSize, 50)) });
    if (error) throw new Error('Could not claim Passport webhook deliveries');
    const claims = (data ?? []) as ClaimedDelivery[];
    const settled = await runWithConcurrency(claims, 3, async (claim) => {
      try { return await processClaim(claim); } catch { return 'worker_failed'; }
    });
    const delivered = settled.filter((value) => value === 'delivered').length;
    const retried = settled.filter((value) => value === 'retry_scheduled').length;
    const failed = settled.length - delivered - retried;
    const status = failed === 0 ? 'succeeded' : delivered + retried > 0 ? 'partial' : 'failed';
    await supabase.from('passport_operation_runs').update({ status, claimed_count: claims.length, succeeded_count: delivered, retried_count: retried, failed_count: failed, details: { batch_size: batchSize }, finished_at: new Date().toISOString() }).eq('id', run.id);
    return { ok: status !== 'failed', disabled: false, claimed: claims.length, delivered, retried, failed, run_id: run.id };
  } catch (error) {
    await supabase.from('passport_operation_runs').update({ status: 'failed', failed_count: 1, details: { error: error instanceof Error ? error.message : 'unknown' }, finished_at: new Date().toISOString() }).eq('id', run.id);
    throw error;
  }
}
