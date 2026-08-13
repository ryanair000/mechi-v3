import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { revokeTeamPassportAchievement } from '@/lib/passport-community';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  if (!hasModeratorAccess(access.profile)) return NextResponse.json({ error: 'Moderator access required' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; const reason = String(body.reason ?? '').trim();
  if (reason.length < 3) return NextResponse.json({ error: 'Add a revocation reason' }, { status: 400 });
  const result = await revokeTeamPassportAchievement((await params).id, access.profile.id, reason);
  return NextResponse.json(result.revoked ? { success: true } : { error: result.error }, { status: result.revoked ? 200 : 404 });
}
