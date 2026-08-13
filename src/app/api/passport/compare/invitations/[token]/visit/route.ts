import { NextRequest, NextResponse } from 'next/server';
import { recordComparisonInvitationVisit } from '@/lib/passport-social';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const recorded = await recordComparisonInvitationVisit((await params).token, String(body.left ?? ''), String(body.right ?? ''));
  return NextResponse.json({ recorded }, { status: recorded ? 200 : 404 });
}
