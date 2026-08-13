import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { disconnectPassportProvider, getPassportConnectionHubData } from '@/lib/passport-connections';
import type { PassportProviderKey } from '@/lib/passport-connections-types';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

const PROVIDERS = ['steam', 'twitch', 'youtube', 'xbox', 'psn', 'nintendo'];
export async function GET(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; return NextResponse.json({ ...(await getPassportConnectionHubData(access.profile.id)), rollout: getPassportFeatureAccess('connections', access.profile.id) }); }
export async function DELETE(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const body = await request.json().catch(() => ({})) as Record<string, unknown>; const provider = String(body.provider ?? ''); if (!PROVIDERS.includes(provider)) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 }); const result = await disconnectPassportProvider(access.profile.id, provider as PassportProviderKey, body.erase_provider_data === true); return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 400 }); }
