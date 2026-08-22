import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  capturePassportProductEvent,
  passportAnalyticsRequestSeed,
  type PassportProductEventName,
} from '@/lib/passport-analytics';

const CLIENT_EVENTS = new Set<PassportProductEventName>([
  'passport_onboarding_completed',
  'passport_card_shared',
  'passport_cv_downloaded',
  'passport_replay_shared',
]);

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = typeof body?.event === 'string'
    ? body.event as PassportProductEventName
    : null;
  if (!event || !CLIENT_EVENTS.has(event)) {
    return NextResponse.json({ error: 'Unsupported Passport analytics event' }, { status: 400 });
  }

  await capturePassportProductEvent({
    event,
    subjectUserId: access.profile.id,
    actorKind: 'owner',
    source: 'api.passport.analytics',
    properties: body?.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)
      ? body.properties as Record<string, unknown>
      : {},
    dedupeSeed: `${passportAnalyticsRequestSeed(request)}:${Math.floor(Date.now() / 10_000)}`,
  });

  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
}
