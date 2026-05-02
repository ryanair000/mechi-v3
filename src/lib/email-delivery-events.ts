import type { SupabaseClient } from '@supabase/supabase-js';

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
    return false;
  }

  console.error('[Email Delivery Events] Claim error:', error);
  return false;
}

export const claimEmailDeliveryEvent = claimDeliveryEvent;
