import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { setPassportActivityReaction } from '@/lib/passport-community';
import type { PassportActivityReaction } from '@/lib/passport-community-types';
const ALLOWED: PassportActivityReaction[] = ['gg', 'fire', 'clap', 'trophy'];
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const reaction = String((await request.json().catch(() => ({})) as Record<string, unknown>).reaction ?? '') as PassportActivityReaction; if (!ALLOWED.includes(reaction)) return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 }); const result = await setPassportActivityReaction((await params).id, access.profile.id, reaction); return NextResponse.json(result.ok ? { reaction: result.data } : { error: result.error }, { status: result.status }); }
