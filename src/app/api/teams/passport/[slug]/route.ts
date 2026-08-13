import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile } from '@/lib/access';
import { getTeamPassport } from '@/lib/passport-community';
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) { const viewer = await getRequestAccessProfile(request); const team = await getTeamPassport((await params).slug, viewer?.id); return NextResponse.json(team ? { team } : { error: 'Team Passport not found' }, { status: team ? 200 : 404 }); }
