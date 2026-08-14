import { after } from 'next/server';
import { buildGamerCvPdf } from '@/lib/passport-cv-pdf';
import { capturePassportProductEvent, passportAnalyticsRequestSeed } from '@/lib/passport-analytics';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';
import { normalizePassportUsername } from '@/lib/passport';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const username = normalizePassportUsername((await params).username);
  const resume = await getPassportCompetitiveResume(username);
  if (!resume) return Response.json({ error: 'Gamer CV not found' }, { status: 404 });
  const pdf = buildGamerCvPdf(resume, new URL(request.url).origin);
  const requestSeed = passportAnalyticsRequestSeed(request);
  after(() => capturePassportProductEvent({
    event: 'passport_cv_downloaded',
    actorKind: 'anonymous',
    source: 'api.passport.cv.pdf',
    properties: { format: 'pdf' },
    dedupeSeed: requestSeed,
  }));
  return new Response(new Uint8Array(pdf), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${resume.identity.username}-gamer-cv.pdf"`,
    'Cache-Control': 'private, no-store',
  } });
}
