import { NextRequest, NextResponse } from 'next/server';
import { findInviterByCode } from '@/lib/invite';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const inviter = await findInviterByCode(createServiceClient(), code);

    if (!inviter) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    return NextResponse.json({ inviter });
  } catch (error) {
    console.error('[Invite GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
