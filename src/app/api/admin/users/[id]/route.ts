import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog, type AuditAction } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import type { UserRole } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      reason?: string;
      role?: UserRole;
    };
    const supabase = createServiceClient();

    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id, username, role, is_banned')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if ((body.action === 'set_role' || target.role !== 'user') && !hasAdminAccess(admin)) {
      return NextResponse.json(
        { error: 'Only admins can change roles or act on moderators/admins' },
        { status: 403 }
      );
    }

    let updateData: Record<string, unknown>;
    let auditAction: AuditAction;

    if (body.action === 'ban') {
      updateData = {
        is_banned: true,
        ban_reason: body.reason?.trim() || null,
        banned_at: new Date().toISOString(),
        banned_by: admin.id,
      };
      auditAction = 'ban_user';
    } else if (body.action === 'unban') {
      updateData = {
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
      };
      auditAction = 'unban_user';
    } else if (body.action === 'set_role') {
      if (!body.role || !['user', 'moderator', 'admin'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      if (body.role === 'admin' && !hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can promote admins' }, { status: 403 });
      }

      updateData = { role: body.role };
      auditAction = 'change_role';
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    await writeAuditLog({
      adminId: admin.id,
      action: auditAction,
      targetType: 'user',
      targetId: id,
      details: {
        username: target.username,
        previousRole: target.role,
        newRole: body.role,
        reason: body.reason ?? null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin User PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
