import { NextResponse } from 'next/server';
import { getTeamPassportAchievementByToken } from '@/lib/passport-community';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const achievement = await getTeamPassportAchievementByToken((await params).token);
  return achievement ? NextResponse.json({ achievement }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } }) : NextResponse.json({ error: 'Team achievement not found' }, { status: 404 });
}
