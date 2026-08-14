import { after, NextRequest } from 'next/server';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import { capturePassportProductEvent, passportAnalyticsRequestSeed } from '@/lib/passport-analytics';
import { getPassportCardPresentation } from '@/lib/passport-card-data';
import { createPassportCardResponse } from '@/lib/passport-card-response';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const requestSeed = passportAnalyticsRequestSeed(request);
  return createPassportCardResponse(
    request,
    normalizePassportUsername(rawUsername),
    {
      loadPassport: getPassportData,
      loadPresentation: getPassportCardPresentation,
      captureGenerated: (event) => after(() => capturePassportProductEvent({
        event: 'passport_card_generated',
        subjectUserId: event.subjectUserId,
        actorKind: 'anonymous',
        source: 'api.passport.cards',
        properties: {
          format: event.format,
          delivery: event.delivery,
          render_state: event.renderState,
        },
        dedupeSeed: requestSeed,
      })),
    }
  );
}
