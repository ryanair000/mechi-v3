import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, getRequestAccessProfile } from '@/lib/access';
import { sendInstagramMessage } from '@/lib/instagram';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sendRateLimit = await checkPersistentRateLimit(
      `admin-instagram-test:${admin.id}:${getClientIp(request)}`,
      10,
      15 * 60 * 1000
    );
    if (!sendRateLimit.allowed) {
      return rateLimitResponse(sendRateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const recipientId =
      typeof body.recipient_id === 'string' && body.recipient_id.trim().length > 0
        ? body.recipient_id.trim()
        : '';
    const message =
      typeof body.message === 'string' && body.message.trim().length > 0
        ? body.message.trim()
        : '';

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: 'recipient_id and message are required' },
        { status: 400 }
      );
    }

    const result = await sendInstagramMessage({
      recipientId,
      message,
    });

    return NextResponse.json({
      success: result.ok,
      result,
    });
  } catch (error) {
    console.error('[Admin Instagram Test] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
