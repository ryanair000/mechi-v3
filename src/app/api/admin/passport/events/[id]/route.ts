import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { revokePassportEventCredential } from '@/lib/passport-resume';
import { createServiceClient } from '@/lib/supabase';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const credentialId = (await params).id;
  const { data: credential } = await createServiceClient().from('passport_event_credentials')
    .select('id, tournament:tournaments(organizer_id)').eq('id', credentialId).maybeSingle();
  const relation = credential?.tournament;
  const tournament = Array.isArray(relation) ? relation[0] : relation;
  if (!hasModeratorAccess(access.profile) && tournament?.organizer_id !== access.profile.id) return NextResponse.json({ error: 'Issuing organizer or moderator access required' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 3) return NextResponse.json({ error: 'Add a correction reason' }, { status: 400 });
  const result = await revokePassportEventCredential(credentialId, access.profile.id, reason.slice(0, 300));
  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 404 });
}
