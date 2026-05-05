import type { SupabaseClient } from '@supabase/supabase-js';

type DeliveryEventStatus = 'claimed' | 'sent' | 'failed' | 'skipped';

async function updateDeliveryEventStatus(
  supabase: SupabaseClient,
  params: {
    eventKey: string;
    status: DeliveryEventStatus;
    error?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const update: Record<string, unknown> = {
    status: params.status,
    error: params.error ?? null,
    updated_at: new Date().toISOString(),
  };

  if (params.metadata) {
    update.metadata = params.metadata;
  }

  const { error } = await supabase
    .from('email_delivery_events')
    .update(update)
    .eq('event_key', params.eventKey);

  if (error) {
    console.error('[Email Delivery Events] Status update error:', error);
  }
}

export async function claimDeliveryEvent(
  supabase: SupabaseClient,
  params: {
    eventKey: string;
    eventType: string;
    recipient: string;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const { error } = await supabase.from('email_delivery_events').insert({
    event_key: params.eventKey,
    event_type: params.eventType,
    recipient: params.recipient,
    user_id: params.userId ?? null,
    metadata: params.metadata ?? {},
  });

  if (!error) {
    return true;
  }

  if (error.code === '23505') {
    const { data: existingEvent, error: lookupError } = await supabase
      .from('email_delivery_events')
      .select('status')
      .eq('event_key', params.eventKey)
      .maybeSingle();

    if (lookupError) {
      console.error('[Email Delivery Events] Claim lookup error:', lookupError);
      return false;
    }

    if ((existingEvent as { status?: string } | null)?.status !== 'failed') {
      return false;
    }

    const { error: reclaimError } = await supabase
      .from('email_delivery_events')
      .update({
        status: 'claimed',
        error: null,
        recipient: params.recipient,
        user_id: params.userId ?? null,
        metadata: params.metadata ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('event_key', params.eventKey)
      .eq('status', 'failed');

    if (reclaimError) {
      console.error('[Email Delivery Events] Reclaim error:', reclaimError);
      return false;
    }

    return true;
  }

  console.error('[Email Delivery Events] Claim error:', error);
  return false;
}

export async function markDeliveryEventSent(
  supabase: SupabaseClient,
  params: { eventKey: string; metadata?: Record<string, unknown> }
) {
  await updateDeliveryEventStatus(supabase, {
    eventKey: params.eventKey,
    status: 'sent',
    metadata: params.metadata,
  });
}

export async function markDeliveryEventFailed(
  supabase: SupabaseClient,
  params: { eventKey: string; error: unknown; metadata?: Record<string, unknown> }
) {
  await updateDeliveryEventStatus(supabase, {
    eventKey: params.eventKey,
    status: 'failed',
    error: params.error instanceof Error ? params.error.message : String(params.error),
    metadata: params.metadata,
  });
}

export async function markDeliveryEventSkipped(
  supabase: SupabaseClient,
  params: { eventKey: string; metadata?: Record<string, unknown> }
) {
  await updateDeliveryEventStatus(supabase, {
    eventKey: params.eventKey,
    status: 'skipped',
    metadata: params.metadata,
  });
}

export const claimEmailDeliveryEvent = claimDeliveryEvent;
