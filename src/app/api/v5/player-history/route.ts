import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

type HistoryItem = {
  id: string;
  source: 'tournament' | 'playmechi' | 'weka_mawe';
  title: string;
  game: string | null;
  status: string;
  payment_status: string | null;
  registered_at: string;
  href: string;
  detail: string | null;
};

function relationship<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const supabase = createServiceClient();
    const userId = access.profile.id;
    const [standard, playmechi, wekaMawe] = await Promise.all([
      supabase
        .from('tournament_players')
        .select('id, payment_status, joined_at, tournament:tournament_id(id, slug, title, game, status)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(50),
      supabase
        .from('online_tournament_registrations')
        .select('id, event_slug, game, in_game_username, eligibility_status, check_in_status, payment_status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('weka_mawe_registrations')
        .select('id, ign, payment_status, eligibility_status, registered_at, edition:edition_id(id, slug, title, game, status)')
        .eq('user_id', userId)
        .order('registered_at', { ascending: false })
        .limit(50),
    ]);

    const warnings: string[] = [];
    if (standard.error) warnings.push('tournament_players');
    if (playmechi.error) warnings.push('online_tournament_registrations');
    if (wekaMawe.error) warnings.push('weka_mawe_registrations');

    const items: HistoryItem[] = [];

    for (const row of standard.data ?? []) {
      const tournament = relationship(row.tournament as {
        id: string;
        slug: string;
        title: string;
        game: string | null;
        status: string;
      } | Array<{ id: string; slug: string; title: string; game: string | null; status: string }> | null);
      items.push({
        id: `tournament:${row.id}`,
        source: 'tournament',
        title: tournament?.title ?? 'Mechi tournament',
        game: tournament?.game ?? null,
        status: tournament?.status ?? 'registered',
        payment_status: row.payment_status ?? null,
        registered_at: row.joined_at,
        href: tournament?.slug ? `/tournaments/${encodeURIComponent(tournament.slug)}` : '/tournaments',
        detail: null,
      });
    }

    for (const row of playmechi.data ?? []) {
      items.push({
        id: `playmechi:${row.id}`,
        source: 'playmechi',
        title: 'PlayMechi Online Gaming Tournament',
        game: row.game ?? null,
        status: row.check_in_status || row.eligibility_status || 'registered',
        payment_status: row.payment_status ?? null,
        registered_at: row.created_at,
        href: '/playmechi',
        detail: row.in_game_username ? `IGN: ${row.in_game_username}` : null,
      });
    }

    for (const row of wekaMawe.data ?? []) {
      const edition = relationship(row.edition as {
        id: string;
        slug: string;
        title: string;
        game: string | null;
        status: string;
      } | Array<{ id: string; slug: string; title: string; game: string | null; status: string }> | null);
      items.push({
        id: `weka_mawe:${row.id}`,
        source: 'weka_mawe',
        title: edition?.title ?? 'Weka Mawe',
        game: edition?.game ?? 'efootball',
        status: edition?.status ?? row.eligibility_status ?? 'registered',
        payment_status: row.payment_status ?? null,
        registered_at: row.registered_at,
        href: '/playmechi/weka-mawe',
        detail: row.ign ? `IGN: ${row.ign}` : null,
      });
    }

    items.sort((left, right) => Date.parse(right.registered_at) - Date.parse(left.registered_at));

    return NextResponse.json({
      registrations: items,
      summary: {
        total: items.length,
        confirmed: items.filter((item) => ['paid', 'free'].includes(item.payment_status ?? '')).length,
      },
      warnings,
    });
  } catch (error) {
    console.error('[V5 Player History] Error:', error);
    return NextResponse.json({ error: 'Failed to load player history' }, { status: 500 });
  }
}
