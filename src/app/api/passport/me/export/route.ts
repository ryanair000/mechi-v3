import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createPassportDataExport, listPassportDataExports } from '@/lib/passport-export';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  try {
    const exports = await listPassportDataExports(access.profile.id);
    return NextResponse.json({ exports }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load Passport exports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const result = await createPassportDataExport(
    access.profile.id,
    request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id')
  );
  if (!result.data) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    export: {
      id: result.data.id,
      expires_at: result.data.expires_at,
      download_url: `/api/passport/me/export/${result.data.token}`,
    },
  }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
