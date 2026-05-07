import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import { runMatchmaking } from '@/lib/matchmaking';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();
    const matchesCreated = await runMatchmaking(supabase);

    await writeAuditLog({
      adminId: admin.id,
      action: 'rerun_matchmaking',
      targetType: 'queue',
      details: {
        matchesCreated,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      matchesCreated,
    });
  } catch (err) {
    console.error('[Admin Queue Reconcile] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
