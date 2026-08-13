import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const tournamentId = (await params).id;
  const supabase = createServiceClient();
  const { data: tournament } = await supabase.from('tournaments').select('id, organizer_id, title, slug, game').eq('id', tournamentId).maybeSingle();
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  if (!hasModeratorAccess(access.profile) && tournament.organizer_id !== access.profile.id) return NextResponse.json({ error: 'Organizer access required' }, { status: 403 });
  const { data: players } = await supabase.from('tournament_players').select('id, user_id, check_in_status, checked_in_at, user:profiles(id, username, avatar_url, passport_profiles(display_name, is_discoverable), passport_profile_summaries(games_count, verified_records_count))').eq('tournament_id', tournamentId).in('payment_status', ['paid', 'free']);
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const lines = ['tournament_player_id,user_id,username,check_in_status,checked_in_at,passport_link'];
    for (const player of players ?? []) {
      const relation = player.user;
      const user = Array.isArray(relation) ? relation[0] : relation;
      lines.push([player.id, player.user_id, user?.username, player.check_in_status, player.checked_in_at, user?.username ? `https://mechi.club/@${user.username}` : ''].map(quote).join(','));
    }
    return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${tournament.slug}-passport-readiness.csv"`, 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ tournament, participants: players ?? [] });
}
