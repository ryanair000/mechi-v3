import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  bucketCount,
  bucketPercentage,
  capturePassportProductEvent,
  passportAnalyticsRequestSeed,
} from '@/lib/passport-analytics';
import { getPassportComparison } from '@/lib/passport-comparison';
import { getPassportOwnerDataByUserId } from '@/lib/passport';

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const ownerPassport = await getPassportOwnerDataByUserId(access.profile.id);
  const ownerHandle = ownerPassport?.identity.publication_status === 'published'
    ? ownerPassport.identity.public_handle
    : null;
  if (!ownerHandle) {
    return NextResponse.json(
      { error: 'Publish your Gamer Passport before comparing with other players' },
      { status: 409 }
    );
  }
  const result = await getPassportComparison(ownerHandle, (await params).username, { viewerId: access.profile.id });
  if (result.data) {
    const comparison = result.data;
    const requestSeed = passportAnalyticsRequestSeed(request);
    after(() => capturePassportProductEvent({
      event: 'passport_comparison_completed',
      subjectUserId: access.profile.id,
      actorKind: 'owner',
      source: 'api.passport.compare',
      properties: {
        relationship: comparison.relationship?.friendship_status
          ?? (comparison.relationship?.is_following ? 'following' : 'stranger'),
        shared_games_bucket: bucketCount(comparison.shared_games.length),
        taste_match_bucket: bucketPercentage(comparison.taste_match.score),
      },
      dedupeSeed: requestSeed,
    }));
  }
  return NextResponse.json(result.data ? { comparison: result.data } : { error: result.error }, { status: result.status });
}
