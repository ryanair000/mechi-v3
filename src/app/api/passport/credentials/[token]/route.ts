import { NextResponse } from 'next/server';
import { getPassportCredentialByToken } from '@/lib/passport-resume';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const credential = await getPassportCredentialByToken((await params).token);
  return credential
    ? NextResponse.json({ credential }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } })
    : NextResponse.json({ error: 'Credential not found' }, { status: 404 });
}
