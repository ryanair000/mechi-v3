import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getWekaMaweSummary } from '@/lib/weka-mawe';

export async function GET(request: NextRequest) {
  try {
    const access = await getRequestAccessProfile(request);
    const summary = await getWekaMaweSummary(createServiceClient(), access?.id ?? null);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[WekaMawe current-edition] Error:', error);
    return NextResponse.json({ error: 'Could not load Weka Mawe.' }, { status: 500 });
  }
}
