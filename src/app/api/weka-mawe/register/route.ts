import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  cleanWekaMaweText,
  getWekaMaweSummary,
  startWekaMaweRegistration,
  verifyAndMarkWekaMawePayment,
} from '@/lib/weka-mawe';

export async function GET(request: NextRequest) {
  const profile = await getRequestAccessProfile(request);
  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
  }

  try {
    const summary = await getWekaMaweSummary(createServiceClient(), profile?.id ?? null);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[WekaMawe register GET] Error:', error);
    return NextResponse.json({ error: 'Could not load registration state.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanWekaMaweText(body.action, 40);
    const supabase = createServiceClient();

    if (action === 'verify_payment') {
      const reference = cleanWekaMaweText(body.reference, 140);
      if (!reference) {
        return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 });
      }

      const result = await verifyAndMarkWekaMawePayment({
        supabase,
        userId: access.profile.id,
        reference,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error ?? 'Payment not confirmed.' }, { status: 400 });
      }

      return NextResponse.json(await getWekaMaweSummary(supabase, access.profile.id));
    }

    const ign = cleanWekaMaweText(body.ign, 80);
    const phone = cleanWekaMaweText(body.phone, 40) || access.profile.phone;
    const whatsappNumber = cleanWekaMaweText(body.whatsappNumber, 40) || phone;

    if (!ign) {
      return NextResponse.json({ error: 'eFootball IGN is required.' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Contact phone is required.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', access.profile.id)
      .maybeSingle();
    const email = cleanWekaMaweText(profile?.email, 160) || `${access.profile.username || 'player'}@mechi.club`;

    const result = await startWekaMaweRegistration({
      supabase,
      userId: access.profile.id,
      username: access.profile.username,
      email,
      phone,
      ign,
      whatsappNumber,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Could not register.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[WekaMawe register POST] Error:', error);
    return NextResponse.json({ error: 'Could not submit registration.' }, { status: 500 });
  }
}
