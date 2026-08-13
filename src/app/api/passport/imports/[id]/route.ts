import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { reviewPassportExternalItem } from '@/lib/passport-connections';

const ACTIONS = ['accept', 'hide', 'restore'] as const; const VISIBILITIES = ['public', 'friends', 'private'] as const;
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const body = await request.json().catch(() => ({})) as Record<string, unknown>; const action = String(body.action ?? ''); const visibility = String(body.visibility ?? 'private'); if (!ACTIONS.includes(action as typeof ACTIONS[number]) || !VISIBILITIES.includes(visibility as typeof VISIBILITIES[number])) return NextResponse.json({ error: 'Invalid import action or visibility' }, { status: 400 }); const result = await reviewPassportExternalItem(access.profile.id, (await params).id, action as typeof ACTIONS[number], visibility as typeof VISIBILITIES[number]); return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.status }); }
