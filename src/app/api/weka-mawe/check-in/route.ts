import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { checkInWekaMawePlayer, getWekaMaweSummary } from '@/lib/weka-mawe';

export async function GET(request: NextRequest) {
  const profile = await getRequestAccessProfile(request);
  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
  }

  try {
    return NextResponse.json(await getWekaMaweSummary(createServiceClient(), profile?.id ?? null));
  } catch (error) {
    console.error('[WekaMawe check-in GET] Error:', error);
    return NextResponse.json({ error: 'Could not load check-in.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const supabase = createServiceClient();
    const result = await checkInWekaMawePlayer({ supabase, userId: access.profile.id });
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Could not check in.' }, { status: 400 });
    }
    return NextResponse.json(await getWekaMaweSummary(supabase, access.profile.id));
  } catch (error) {
    console.error('[WekaMawe check-in POST] Error:', error);
    return NextResponse.json({ error: 'Could not check in.' }, { status: 500 });
  }
}
