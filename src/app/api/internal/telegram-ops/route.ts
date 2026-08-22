import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secureEqual(a: string, b: string) {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function authorized(request: NextRequest) {
  const expected = process.env.OPS_HUB_SECRET?.trim() || '';
  const submitted = request.headers.get('x-ops-secret')?.trim() || '';
  return secureEqual(expected, submitted);
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !key) throw new Error('Supabase service configuration is missing.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function playerSummary() {
  const supabase = supabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, banned, new24h, new7d, recent] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabase.from('profiles').select('id,username,country,region,plan,created_at').order('created_at', { ascending: false }).limit(12),
  ]);

  for (const result of [total, banned, new24h, new7d, recent]) {
    if (result.error) throw result.error;
  }

  return {
    registered: Math.max(0, Number(total.count || 0) - Number(banned.count || 0)),
    banned: Number(banned.count || 0),
    new24h: Number(new24h.count || 0),
    new7d: Number(new7d.count || 0),
    latest: recent.data || [],
  };
}

async function tournamentSummary() {
  const supabase = supabaseAdmin();
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id,slug,title,game,platform,entry_fee,prize_pool,size,status,scheduled_for,created_at')
    .in('status', ['open', 'active'])
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .limit(20);
  if (error) throw error;

  const ids = (tournaments || []).map((row) => row.id).filter(Boolean);
  const { data: players, error: playerError } = ids.length
    ? await supabase
        .from('tournament_players')
        .select('tournament_id,payment_status')
        .in('tournament_id', ids)
        .in('payment_status', ['paid', 'free'])
    : { data: [], error: null };
  if (playerError) throw playerError;

  const counts = (players || []).reduce<Record<string, number>>((map, row) => {
    if (row.tournament_id) map[row.tournament_id] = (map[row.tournament_id] || 0) + 1;
    return map;
  }, {});

  return (tournaments || []).map((row) => ({
    ...row,
    confirmedPlayers: counts[row.id] || 0,
    spotsLeft: Math.max(0, Number(row.size || 0) - (counts[row.id] || 0)),
  }));
}

async function weekendCupSummary() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('game,payment_status,entry_fee_kes,eligibility_status,check_in_status,created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const rows = (data || []).filter((row) => row.eligibility_status !== 'disqualified');
  const byGame = rows.reduce<Record<string, { registered: number; paid: number; pending: number; checkedIn: number; revenueKes: number }>>((map, row) => {
    const game = String(row.game || 'unknown');
    const current = map[game] || { registered: 0, paid: 0, pending: 0, checkedIn: 0, revenueKes: 0 };
    current.registered += 1;
    if (row.payment_status === 'paid') {
      current.paid += 1;
      current.revenueKes += Number(row.entry_fee_kes || 0);
      if (row.check_in_status === 'checked_in') current.checkedIn += 1;
    }
    if (row.payment_status === 'pending_payment' || row.payment_status === 'manual_review') current.pending += 1;
    map[game] = current;
    return map;
  }, {});

  return {
    registered: rows.length,
    paid: Object.values(byGame).reduce((sum, game) => sum + game.paid, 0),
    pending: Object.values(byGame).reduce((sum, game) => sum + game.pending, 0),
    checkedIn: Object.values(byGame).reduce((sum, game) => sum + game.checkedIn, 0),
    revenueKes: Object.values(byGame).reduce((sum, game) => sum + game.revenueKes, 0),
    byGame,
  };
}

async function summary() {
  const [players, tournaments, weekendCup] = await Promise.all([
    playerSummary(),
    tournamentSummary(),
    weekendCupSummary(),
  ]);
  return {
    source: 'playmechi',
    generatedAt: new Date().toISOString(),
    players,
    tournaments,
    weekendCup,
  };
}

async function searchPlayer(rawQuery: string) {
  const query = rawQuery.trim().replace(/^@/, '');
  if (!query) return [];
  const safe = query.replace(/[%_\\]/g, '\\$&');
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,country,region,plan,is_banned,created_at')
    .ilike('username', `%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const url = new URL(request.url);
  const action = String(body.action || url.searchParams.get('action') || 'summary').trim().toLowerCase();

  try {
    if (action === 'summary') {
      return NextResponse.json({ ok: true, data: await summary() }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'tournaments') {
      return NextResponse.json({ ok: true, data: await tournamentSummary() }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'search-player') {
      const query = String(body.query || url.searchParams.get('q') || '');
      return NextResponse.json({ ok: true, data: await searchPlayer(query) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'Unknown action', available: ['summary', 'tournaments', 'search-player'] }, { status: 400 });
  } catch (error) {
    console.error('[telegram-ops] PlayMechi adapter failed:', error);
    return NextResponse.json({ error: 'Ops adapter failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
