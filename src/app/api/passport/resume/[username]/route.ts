import { NextResponse } from 'next/server';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';
import { normalizePassportUsername } from '@/lib/passport';

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const username = normalizePassportUsername((await params).username);
  const resume = await getPassportCompetitiveResume(username);
  return resume
    ? NextResponse.json({ resume }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } })
    : NextResponse.json({ error: 'Gamer Resume not found' }, { status: 404 });
}
