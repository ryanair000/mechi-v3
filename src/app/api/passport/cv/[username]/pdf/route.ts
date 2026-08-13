import { buildGamerCvPdf } from '@/lib/passport-cv-pdf';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';
import { normalizePassportUsername } from '@/lib/passport';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const username = normalizePassportUsername((await params).username);
  const resume = await getPassportCompetitiveResume(username);
  if (!resume) return Response.json({ error: 'Gamer CV not found' }, { status: 404 });
  const pdf = buildGamerCvPdf(resume, new URL(request.url).origin);
  return new Response(new Uint8Array(pdf), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${resume.identity.username}-gamer-cv.pdf"`,
    'Cache-Control': 'private, no-store',
  } });
}
