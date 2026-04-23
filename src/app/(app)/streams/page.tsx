import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { verifyToken } from '@/lib/auth';
import { GAMES } from '@/lib/config';
import { resolvePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation, isActiveTournamentPlayerStatus } from '@/lib/tournaments';
import type { GameKey, LiveStream } from '@/types';
import {
  StreamsPageClient,
  type StreamHubEntry,
  type StreamHubTarget,
  type StreamHubViewer,
} from './streams-page-client';

const STREAM_SELECT =
  'id, tournament_id, match_id, mux_playback_id, status, title, viewer_count, started_at, ended_at, recording_playback_id, created_at, updated_at, streamer:streamer_id(id, username), tournament:tournament_id(id, slug, title, game, is_featured), match:match_id(id, game, status, player1:player1_id(id, username), player2:player2_id(id, username))';

type UserRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

type TournamentRelation =
  | {
      id: string;
      slug: string;
      title: string;
      game: GameKey;
      is_featured?: boolean | null;
      status?: string | null;
      created_at?: string | null;
    }
  | Array<{
      id: string;
      slug: string;
      title: string;
      game: GameKey;
      is_featured?: boolean | null;
      status?: string | null;
      created_at?: string | null;
    }>
  | null
  | undefined;

type MatchRelation =
  | {
      id: string;
      game: GameKey;
      status: string;
      player1?: UserRelation;
      player2?: UserRelation;
    }
  | Array<{
      id: string;
      game: GameKey;
      status: string;
      player1?: UserRelation;
      player2?: UserRelation;
    }>
  | null
  | undefined;

type StreamQueryRow = Pick<
  LiveStream,
  | 'id'
  | 'tournament_id'
  | 'match_id'
  | 'mux_playback_id'
  | 'status'
  | 'title'
  | 'viewer_count'
  | 'started_at'
  | 'ended_at'
  | 'recording_playback_id'
  | 'created_at'
  | 'updated_at'
> & {
  streamer?: UserRelation;
  tournament?: TournamentRelation;
  match?: MatchRelation;
};

type ParticipantTournamentRow = {
  payment_status: string | null;
  tournament?: TournamentRelation;
};

type TournamentTargetRow = {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  is_featured?: boolean | null;
  status?: string | null;
  created_at?: string | null;
};

type MatchTargetRow = {
  id: string;
  game: GameKey;
  player1?: UserRelation;
  player2?: UserRelation;
};

function normalizeStream(row: StreamQueryRow | null): StreamHubEntry | null {
  if (!row) {
    return null;
  }

  const match = firstRelation(row.match as MatchRelation);

  return {
    ...row,
    streamer: firstRelation(row.streamer as UserRelation),
    tournament: firstRelation(row.tournament as TournamentRelation),
    match: match
      ? {
          ...match,
          player1: firstRelation(match.player1 as UserRelation),
          player2: firstRelation(match.player2 as UserRelation),
        }
      : null,
  };
}

function pushUniqueStream(list: StreamHubEntry[], stream: StreamHubEntry | null) {
  if (!stream || list.some((item) => item.id === stream.id)) {
    return list;
  }

  return [stream, ...list];
}

function sortTargets(a: StreamHubTarget, b: StreamHubTarget) {
  const aHasStream = Boolean(a.existingStreamId);
  const bHasStream = Boolean(b.existingStreamId);

  if (aHasStream !== bHasStream) {
    return Number(bHasStream) - Number(aHasStream);
  }

  return a.title.localeCompare(b.title);
}

export default async function StreamsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    redirect('/login');
  }

  const supabase = createServiceClient();
  const { data: viewerProfileRaw } = await supabase
    .from('profiles')
    .select('id, username, is_banned, plan, plan_expires_at, role, phone')
    .eq('id', payload.sub)
    .maybeSingle();

  const viewerProfile = viewerProfileRaw as
    | {
        id: string;
        username: string;
        is_banned: boolean | null;
        plan: string | null;
        plan_expires_at: string | null;
        role: 'user' | 'moderator' | 'admin' | null;
        phone: string | null;
      }
    | null;

  if (!viewerProfile || viewerProfile.is_banned) {
    redirect('/login');
  }

  const resolvedPlan = resolvePlan(viewerProfile.plan, viewerProfile.plan_expires_at);
  const isPrimaryAdmin = hasPrimaryAdminAccess({
    phone: viewerProfile.phone ?? '',
    role: viewerProfile.role ?? 'user',
  });

  const viewer: StreamHubViewer = {
    id: viewerProfile.id,
    username: viewerProfile.username,
    plan: resolvedPlan,
    isPrimaryAdmin,
    canBroadcast: isPrimaryAdmin || resolvedPlan === 'elite',
  };

  const [
    liveAndStandbyResult,
    replayResult,
    myStreamResult,
    organizerTournamentResult,
    participantTournamentResult,
    activeMatchesResult,
  ] = await Promise.all([
    supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .in('status', ['idle', 'active'])
      .order('updated_at', { ascending: false })
      .limit(18),
    supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .eq('status', 'ended')
      .not('recording_playback_id', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(12),
    supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .in('status', ['idle', 'active'])
      .eq('streamer_id', payload.sub)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('tournaments')
      .select('id, slug, title, game, is_featured, status, created_at')
      .eq('organizer_id', payload.sub)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('tournament_players')
      .select(
        'payment_status, tournament:tournament_id(id, slug, title, game, is_featured, status, created_at)'
      )
      .eq('user_id', payload.sub)
      .order('joined_at', { ascending: false })
      .limit(12),
    supabase
      .from('matches')
      .select('id, game, player1:player1_id(id, username), player2:player2_id(id, username)')
      .eq('status', 'pending')
      .or(`player1_id.eq.${payload.sub},player2_id.eq.${payload.sub}`)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const liveAndStandby = ((liveAndStandbyResult.data ?? []) as StreamQueryRow[])
    .map((row) => normalizeStream(row))
    .filter((stream): stream is StreamHubEntry => Boolean(stream));
  const replays = ((replayResult.data ?? []) as StreamQueryRow[])
    .map((row) => normalizeStream(row))
    .filter((stream): stream is StreamHubEntry => Boolean(stream));
  const myStream = normalizeStream((myStreamResult.data ?? null) as StreamQueryRow | null);

  const liveNow = pushUniqueStream(
    liveAndStandby.filter((stream) => stream.status === 'active'),
    myStream?.status === 'active' ? myStream : null
  );
  const standby = pushUniqueStream(
    liveAndStandby.filter((stream) => stream.status === 'idle'),
    myStream?.status === 'idle' ? myStream : null
  );

  const activeStreamByTournamentId = new Map<string, StreamHubEntry>();
  const activeStreamByMatchId = new Map<string, StreamHubEntry>();

  for (const stream of [...liveNow, ...standby]) {
    if (stream.tournament_id && !activeStreamByTournamentId.has(stream.tournament_id)) {
      activeStreamByTournamentId.set(stream.tournament_id, stream);
    }

    if (stream.match_id && !activeStreamByMatchId.has(stream.match_id)) {
      activeStreamByMatchId.set(stream.match_id, stream);
    }
  }

  const tournamentTargets = new Map<string, StreamHubTarget>();

  for (const tournamentRow of (organizerTournamentResult.data ?? []) as TournamentTargetRow[]) {
    const existingStream = activeStreamByTournamentId.get(tournamentRow.id) ?? null;

    tournamentTargets.set(tournamentRow.id, {
      id: tournamentRow.id,
      type: 'tournament',
      title: tournamentRow.title,
      subtitle: `${GAMES[tournamentRow.game]?.label ?? tournamentRow.game} / Organizer control room`,
      game: tournamentRow.game,
      href: `/t/${tournamentRow.slug}`,
      defaultTitle: `${tournamentRow.title} Live`,
      existingStreamId: existingStream?.id ?? null,
      existingStreamStatus: existingStream?.status ?? null,
    });
  }

  for (const row of (participantTournamentResult.data ?? []) as ParticipantTournamentRow[]) {
    if (!isActiveTournamentPlayerStatus(row.payment_status)) {
      continue;
    }

    const tournament = firstRelation(row.tournament as TournamentRelation);
    if (!tournament || tournament.status !== 'active' || tournamentTargets.has(tournament.id)) {
      continue;
    }

    const existingStream = activeStreamByTournamentId.get(tournament.id) ?? null;

    tournamentTargets.set(tournament.id, {
      id: tournament.id,
      type: 'tournament',
      title: tournament.title,
      subtitle: `${GAMES[tournament.game]?.label ?? tournament.game} / Joined bracket broadcast`,
      game: tournament.game,
      href: `/t/${tournament.slug}`,
      defaultTitle: `${tournament.title} Live`,
      existingStreamId: existingStream?.id ?? null,
      existingStreamStatus: existingStream?.status ?? null,
    });
  }

  const matchTargets = ((activeMatchesResult.data ?? []) as MatchTargetRow[])
    .map((match) => {
      const player1 = firstRelation(match.player1 as UserRelation);
      const player2 = firstRelation(match.player2 as UserRelation);
      const opponent =
        player1?.id === viewer.id
          ? player2?.username ?? 'Opponent'
          : player1?.username ?? 'Opponent';
      const existingStream = activeStreamByMatchId.get(match.id) ?? null;

      return {
        id: match.id,
        type: 'match' as const,
        title: `Match vs ${opponent}`,
        subtitle: `${GAMES[match.game]?.label ?? match.game} / Direct gameplay broadcast`,
        game: match.game,
        href: `/match/${match.id}`,
        defaultTitle: `${GAMES[match.game]?.label ?? match.game} vs ${opponent}`,
        existingStreamId: existingStream?.id ?? null,
        existingStreamStatus: existingStream?.status ?? null,
      };
    })
    .sort(sortTargets);

  return (
    <StreamsPageClient
      viewer={viewer}
      liveNow={liveNow}
      standby={standby}
      replays={replays}
      myStream={myStream}
      tournamentTargets={[...tournamentTargets.values()].sort(sortTargets)}
      matchTargets={matchTargets}
    />
  );
}
