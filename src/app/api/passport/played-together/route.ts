import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportPlayedTogether } from '@/lib/passport-community';
export async function GET(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; return NextResponse.json({ players: await getPassportPlayedTogether(access.profile.id) }); }
