import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase';
import {
  sanitizePassportAnalyticsProperties,
  type PassportAnalyticsActorKind,
  type PassportProductEventName,
} from '@/lib/passport-analytics-contract';

export {
  PASSPORT_PRODUCT_EVENTS,
  bucketCount,
  bucketPercentage,
  sanitizePassportAnalyticsProperties,
  type PassportAnalyticsActorKind,
  type PassportProductEventName,
} from '@/lib/passport-analytics-contract';

type ProductEventInput = {
  event: PassportProductEventName;
  subjectUserId?: string | null;
  actorKind: PassportAnalyticsActorKind;
  source: string;
  properties?: Record<string, unknown>;
  dedupeSeed?: string;
  occurredAt?: string;
};

function dedupeKey(input: ProductEventInput) {
  return createHash('sha256')
    .update([
      'passport-product-v1',
      input.event,
      input.subjectUserId ?? 'anonymous',
      input.dedupeSeed ?? randomUUID(),
    ].join(':'))
    .digest('hex');
}

export function passportAnalyticsRequestSeed(request: Request): string {
  return request.headers.get('x-request-id')
    ?? request.headers.get('x-vercel-id')
    ?? randomUUID();
}

export async function capturePassportProductEvent(input: ProductEventInput): Promise<void> {
  const source = input.source.trim().slice(0, 80);
  if (source.length < 2) return;

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const expiresAt = new Date(new Date(occurredAt).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await createServiceClient().from('passport_product_events').insert({
    event_name: input.event,
    subject_user_id: input.subjectUserId ?? null,
    actor_kind: input.actorKind,
    source,
    properties: sanitizePassportAnalyticsProperties(input.event, input.properties),
    dedupe_key: dedupeKey(input),
    occurred_at: occurredAt,
    expires_at: expiresAt,
  });

  if (error && error.code !== '23505') {
    console.warn('[Passport Analytics]', JSON.stringify({
      event: input.event,
      source,
      error_class: error.code ?? 'storage_error',
    }));
  }
}
