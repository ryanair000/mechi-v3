import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { recordPassportComparisonEvent } from '@/lib/passport-social';

const EVENTS = ['viewed', 'shared', 'recommendation_sent', 'challenge_started'] as const;
export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const eventType = String(body.event_type ?? '') as (typeof EVENTS)[number];
  if (!EVENTS.includes(eventType)) return NextResponse.json({ error: 'Invalid comparison event' }, { status: 400 });
  const recorded = await recordPassportComparisonEvent(access.profile.id, String(body.target_id ?? ''), eventType);
  return NextResponse.json({ recorded }, { status: recorded ? 201 : 400 });
}
