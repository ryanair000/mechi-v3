import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getPassportOperationsHealth, runPassportRetentionCleanup } from '@/lib/passport-operations';
import { deliverPassportWebhooks } from '@/lib/passport-webhook-delivery';
import { getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return { profile: null, response: access.response };
  if (!hasAdminAccess(access.profile)) return { profile: null, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  return { profile: access.profile, response: null };
}

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request); if (access.response) return access.response;
  return NextResponse.json(await getPassportOperationsHealth(), { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request); if (access.response || !access.profile) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? '');
  try {
    const result = action === 'deliver_webhooks'
      ? await deliverPassportWebhooks('admin', 12)
      : action === 'cleanup_retention'
        ? await runPassportRetentionCleanup('admin')
        : null;
    if (!result) return NextResponse.json({ error: 'Unknown Passport operation' }, { status: 400 });
    await writeAuditLog({ adminId: access.profile.id, action: 'system_note', targetType: 'system', details: { subsystem: 'passport', action, result }, ipAddress: getClientIp(request) });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Passport Operations] Manual operation failed', error);
    return NextResponse.json({ error: 'Passport operation failed' }, { status: 500 });
  }
}
