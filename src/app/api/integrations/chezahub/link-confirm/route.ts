import { NextRequest, NextResponse } from 'next/server';
import {
  addRewardReviewQueueItem,
  hasValidSignedAction,
  hashRewardBindingValue,
  verifyChezahubLinkToken,
} from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

type LinkConfirmBody = {
  token?: string;
  chezahub_user_id?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as LinkConfirmBody;

  if (!hasValidSignedAction(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = String(body.token ?? '').trim();
  const chezahubUserId = String(body.chezahub_user_id ?? '').trim();
  if (!token || !chezahubUserId) {
    return NextResponse.json({ error: 'token and chezahub_user_id are required' }, { status: 400 });
  }

  const tokenPayload = verifyChezahubLinkToken(token);
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Invalid or expired link token' }, { status: 400 });
  }

  const tokenHash = hashRewardBindingValue(token);
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: sessionRaw } = await supabase
    .from('reward_link_sessions')
    .select('id, mechi_user_id, status, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  const session = sessionRaw as {
    id: string;
    mechi_user_id: string;
    status: string;
    expires_at: string;
  } | null;

  if (!session || session.mechi_user_id !== tokenPayload.mechi_user_id) {
    return NextResponse.json({ error: 'Unknown link session' }, { status: 404 });
  }

  if (session.status !== 'initiated') {
    return NextResponse.json({ error: 'This link token has already been used' }, { status: 409 });
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase
      .from('reward_link_sessions')
      .update({ status: 'expired', updated_at: now })
      .eq('id', session.id);
    return NextResponse.json({ error: 'Link token expired' }, { status: 410 });
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('id, chezahub_user_id')
    .eq('id', tokenPayload.mechi_user_id)
    .single();

  if (profileError || !profileRaw) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const profile = profileRaw as {
    id: string;
    chezahub_user_id?: string | null;
  };

  if (profile.chezahub_user_id && profile.chezahub_user_id !== chezahubUserId) {
    await addRewardReviewQueueItem(supabase, {
      userId: profile.id,
      reason: 'chezahub_link_conflict',
      dedupeKey: `reward-review:link-conflict:${profile.id}`,
      metadata: {
        existing_chezahub_user_id: profile.chezahub_user_id,
        attempted_chezahub_user_id: chezahubUserId,
        customer_email: body.customer_email ?? null,
        customer_phone: body.customer_phone ?? null,
      },
    }).catch(() => null);

    await supabase
      .from('reward_link_sessions')
      .update({
        status: 'rejected',
        updated_at: now,
        metadata: {
          reason: 'profile_already_linked',
          existing_chezahub_user_id: profile.chezahub_user_id,
        },
      })
      .eq('id', session.id)
      .eq('status', 'initiated');

    return NextResponse.json({ error: 'This Mechi profile is already linked to another ChezaHub account' }, { status: 409 });
  }

  const { data: claimedSession } = await supabase
    .from('reward_link_sessions')
    .update({
      chezahub_user_id: chezahubUserId,
      status: 'linked',
      linked_at: now,
      updated_at: now,
      metadata: {
        customer_email: body.customer_email ?? null,
        customer_phone: body.customer_phone ?? null,
      },
    })
    .eq('id', session.id)
    .eq('status', 'initiated')
    .select('id')
    .maybeSingle();

  if (!claimedSession) {
    return NextResponse.json({ error: 'This link token has already been consumed' }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      chezahub_user_id: chezahubUserId,
      chezahub_linked_at: now,
    })
    .eq('id', profile.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    linked: true,
    mechi_user_id: profile.id,
    chezahub_user_id: chezahubUserId,
    return_url: tokenPayload.return_url,
    legacy_flow: true,
  });
}
