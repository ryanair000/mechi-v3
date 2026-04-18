import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  createChezahubLinkToken,
  getChezahubBaseUrl,
  hashRewardBindingValue,
  verifyChezahubLinkToken,
} from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: profileRaw, error } = await supabase
      .from('profiles')
      .select('id, username, invite_code, chezahub_user_id')
      .eq('id', authUser.sub)
      .single();

    if (error || !profileRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileRaw as {
      id: string;
      username: string;
      invite_code?: string | null;
      chezahub_user_id?: string | null;
    };

    if (profile.chezahub_user_id) {
      return NextResponse.json({ error: 'ChezaHub account already linked' }, { status: 409 });
    }

    const returnUrl = `${request.nextUrl.origin}/share?chezahub_link=success`;
    const token = createChezahubLinkToken({
      mechi_user_id: profile.id,
      username: profile.username,
      invite_code: profile.invite_code ?? null,
      return_url: returnUrl,
    });
    const tokenPayload = verifyChezahubLinkToken(token);

    if (!tokenPayload) {
      throw new Error('Failed to create a valid account-link token');
    }

    const now = new Date().toISOString();
    await supabase
      .from('reward_link_sessions')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('mechi_user_id', profile.id)
      .eq('status', 'initiated')
      .lt('expires_at', now);

    const tokenHash = hashRewardBindingValue(token);
    const { error: sessionError } = await supabase.from('reward_link_sessions').insert({
      mechi_user_id: profile.id,
      token_hash: tokenHash,
      expires_at: new Date(tokenPayload.expires_at).toISOString(),
      metadata: {
        return_url: tokenPayload.return_url,
      },
    });

    if (sessionError) {
      throw sessionError;
    }

    const linkUrl = new URL(getChezahubBaseUrl());
    linkUrl.searchParams.set('mechi_link_token', token);
    linkUrl.searchParams.set('mechi_return', returnUrl);

    return NextResponse.json({ link_url: linkUrl.toString() });
  } catch (routeError) {
    console.error('[Rewards Link Start] Error:', routeError);
    return NextResponse.json({ error: 'Failed to create account link' }, { status: 500 });
  }
}
