import { NextRequest } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { consumePassportDataExport } from '@/lib/passport-export';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const result = await consumePassportDataExport(
    access.profile.id,
    (await params).token,
    request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id')
  );
  if (!result) return Response.json({ error: 'Passport export is unavailable or expired' }, { status: 404 });
  const body = `${JSON.stringify(result.payload, null, 2)}\n`;
  return new Response(body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="playmechi-passport-export-${result.id}.json"`,
      'Content-Length': String(Buffer.byteLength(body)),
      'Content-Type': 'application/json; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
