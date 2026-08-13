import { NextRequest, NextResponse } from 'next/server';
import { submitPassportPartnerIssuance } from '@/lib/passport-partners';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

export async function POST(request: NextRequest) { const rollout = getPassportFeatureAccess('partner_api'); if (!rollout.enabled) return NextResponse.json({ error: rollout.reason, code: 'rollout_disabled' }, { status: 503, headers: { 'Retry-After': '300' } }); const authorization = request.headers.get('authorization') ?? ''; const key = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''; const body = await request.json().catch(() => ({})) as Record<string, unknown>; const result = await submitPassportPartnerIssuance(key, request.headers.get('Idempotency-Key') ?? '', body); return NextResponse.json(result.request ? { request: result.request } : { error: result.error }, { status: result.status, headers: { 'Cache-Control': 'no-store' } }); }
