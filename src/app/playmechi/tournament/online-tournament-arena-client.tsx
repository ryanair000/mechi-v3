'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ClipboardCheck,
  ImageIcon,
  Loader2,
  LockKeyhole,
  Medal,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import {
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  ONLINE_TOURNAMENT_BR_MATCH_NUMBERS,
  getGamePrizeLabels,
  isBattleRoyaleTournamentGame,
  type OnlineTournamentBattleRoyaleGameKey,
} from '@/lib/online-tournament-ops';
import type {
  OnlineTournamentPlayerState,
  OnlineTournamentSafeFixture,
  OnlineTournamentSafeRegistration,
  OnlineTournamentSafeStanding,
} from '@/lib/online-tournament-store';

type PlayerRoom = OnlineTournamentPlayerState['rooms'][number];
type ResultSubmission = OnlineTournamentPlayerState['mySubmissions'][number];

const STATE_API_PATH = '/api/events/mechi-online-gaming-tournament/state';
const RESULTS_API_PATH = '/api/events/mechi-online-gaming-tournament/results';

function getGameFromSearch(value: string | null): OnlineTournamentGameKey {
  if (value === 'pubgm' || value === 'codm' || value === 'efootball') {
    return value;
  }

  return 'pubgm';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'TBA';

  try {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'TBA';
  }
}

function formatStatus(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ');
}

function getStatusClassName(status: string | null | undefined) {
  switch (status) {
    case 'verified':
    case 'released':
    case 'checked_in':
    case 'ready':
    case 'completed':
    case 'eligible':
    case 'paid':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'rejected':
    case 'disputed':
    case 'disqualified':
    case 'ineligible':
    case 'no_show':
    case 'failed':
      return 'bg-red-500/14 text-red-300';
    case 'pending':
    case 'draft':
    default:
      return 'bg-amber-500/14 text-amber-300';
  }
}

function getPlayerName(player: OnlineTournamentSafeRegistration | null | undefined) {
  return player?.in_game_username || player?.username || 'TBA';
}

function sortFixtures(fixtures: OnlineTournamentSafeFixture[]) {
  const order: Record<string, number> = {
    round_of_16: 1,
    quarterfinal: 2,
    semifinal: 3,
    final: 4,
    bronze: 5,
  };

  return [...fixtures].sort((left, right) => {
    const roundDiff = (order[left.round] ?? 99) - (order[right.round] ?? 99);
    if (roundDiff !== 0) return roundDiff;
    return left.slot - right.slot;
  });
}

function statusPill(status: string) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getStatusClassName(status)}`}>
      {formatStatus(status)}
    </span>
  );
}

function PlayerGate() {
  return (
    <div className="page-container py-8">
      <section className="card circuit-panel p-5 sm:p-6">
        <p className="section-title">PlayMechi tournament</p>
        <h1 className="mt-3 text-[1.65rem] font-black leading-tight text-[var(--text-primary)] sm:text-[2.25rem]">
          Sign in to enter the tournament desk
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          Brackets, room credentials, screenshot uploads, score review, and payouts are handled inside Mechi.club.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={getLoginPath(ONLINE_TOURNAMENT_ARENA_PATH)} className="btn-primary">
            Sign in
          </Link>
          <Link
            href={getRegisterPath({ next: ONLINE_TOURNAMENT_REGISTRATION_PATH })}
            className="btn-ghost"
          >
            Create account
          </Link>
        </div>
      </section>
    </div>
  );
}

export function OnlineTournamentArenaClient() {
  const searchParams = useSearchParams();
  const activeGame = getGameFromSearch(searchParams.get('game'));
  const activeConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[activeGame];
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [state, setState] = useState<OnlineTournamentPlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [battleForm, setBattleForm] = useState({
    matchNumber: '1',
    kills: '',
    placement: '',
  });
  const [efootballForm, setEfootballForm] = useState({
    fixtureId: '',
    player1Score: '',
    player2Score: '',
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const loadState = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!user) return;
      if (mode === 'initial') setLoading(true);
      setRefreshing(true);

      try {
        const res = await authFetch(STATE_API_PATH);
        const data = (await res.json()) as OnlineTournamentPlayerState & { error?: string };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not load tournament');
          setState(null);
          return;
        }

        setState(data);
      } catch {
        toast.error('Network error while loading tournament');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch, user]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    void loadState('initial');
  }, [authLoading, loadState, user]);

  const myRegistration = useMemo(
    () => state?.myRegistrations.find((registration) => registration.game === activeGame) ?? null,
    [activeGame, state]
  );
  const myRegistrationIds = useMemo(
    () => new Set(state?.myRegistrations.map((registration) => registration.id) ?? []),
    [state]
  );
  const activeRooms = useMemo(
    () =>
      (state?.rooms ?? []).filter(
        (room): room is PlayerRoom =>
          room.game === activeGame && isBattleRoyaleTournamentGame(activeGame)
      ),
    [activeGame, state]
  );
  const activeSubmissions = useMemo(
    () => (state?.mySubmissions ?? []).filter((submission) => submission.game === activeGame),
    [activeGame, state]
  );
  const standings = useMemo(
    () =>
      isBattleRoyaleTournamentGame(activeGame)
        ? state?.standings[activeGame as OnlineTournamentBattleRoyaleGameKey] ?? []
        : [],
    [activeGame, state]
  );
  const efootballFixtures = useMemo(
    () => sortFixtures(state?.fixtures ?? []),
    [state]
  );
  const myEfootballFixtures = useMemo(
    () =>
      efootballFixtures.filter(
        (fixture) =>
          fixture.player1?.id && myRegistrationIds.has(fixture.player1.id) ||
          fixture.player2?.id && myRegistrationIds.has(fixture.player2.id)
      ),
    [efootballFixtures, myRegistrationIds]
  );
  const selectableEfootballFixtures = useMemo(
    () =>
      myEfootballFixtures.filter(
        (fixture) => fixture.status !== 'completed' && fixture.status !== 'bye'
      ),
    [myEfootballFixtures]
  );
  const selectedFixtureId =
    efootballForm.fixtureId || selectableEfootballFixtures[0]?.id || myEfootballFixtures[0]?.id || '';

  const handleCheckIn = async () => {
    setActing(`check-in-${activeGame}`);
    try {
      const res = await authFetch(STATE_API_PATH, {
        method: 'POST',
        body: JSON.stringify({ action: 'check_in', game: activeGame }),
      });
      const data = (await res.json()) as OnlineTournamentPlayerState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not check in');
        return;
      }

      setState(data);
      toast.success('Checked in');
    } catch {
      toast.error('Network error while checking in');
    } finally {
      setActing(null);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!myRegistration) {
      toast.error('Register for this game first');
      return;
    }

    if (!screenshot) {
      toast.error('Add a screenshot');
      return;
    }

    const formData = new FormData();
    formData.set('game', activeGame);
    formData.set('screenshot', screenshot);

    if (isBattleRoyaleTournamentGame(activeGame)) {
      formData.set('match_number', battleForm.matchNumber);
      formData.set('kills', battleForm.kills);
      formData.set('placement', battleForm.placement);
    } else {
      formData.set('fixture_id', selectedFixtureId);
      formData.set('player1_score', efootballForm.player1Score);
      formData.set('player2_score', efootballForm.player2Score);
    }

    setUploading(true);
    try {
      const res = await authFetch(RESULTS_API_PATH, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as OnlineTournamentPlayerState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not upload result');
        return;
      }

      setState(data);
      setScreenshot(null);
      setBattleForm({ matchNumber: battleForm.matchNumber, kills: '', placement: '' });
      setEfootballForm({ fixtureId: selectedFixtureId, player1Score: '', player2Score: '' });
      toast.success('Result uploaded for review');
    } catch {
      toast.error('Network error while uploading result');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page-container py-8">
        <div className="h-56 shimmer rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!user) {
    return <PlayerGate />;
  }

  return (
    <div className="page-container space-y-4 py-4">
      <section className="border-b border-[var(--border-color)] pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tournament desk</p>
            <h1 className="mt-2 text-[1.45rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.9rem]">
              {activeConfig.label}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Rooms, standings, screenshots, scores, and rewards for this game.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`${ONLINE_TOURNAMENT_REGISTRATION_PATH}?game=${activeGame}`} className="btn-ghost">
              <Users size={14} />
              Registration
            </Link>
            <button
              type="button"
              onClick={() => void loadState('refresh')}
              disabled={refreshing}
              className="btn-primary"
            >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <PlayerGameStatus
            activeGame={activeGame}
            registration={myRegistration}
            onCheckIn={handleCheckIn}
            acting={acting}
          />

          {isBattleRoyaleTournamentGame(activeGame) ? (
            <>
              <BattleRoyaleRooms rooms={activeRooms} />
              <BattleRoyaleStandings standings={standings} />
            </>
          ) : (
            <EfootballBracket fixtures={efootballFixtures} myRegistrationIds={myRegistrationIds} />
          )}
        </div>

        <aside className="space-y-4">
          <ResultUploadPanel
            activeGame={activeGame}
            registration={myRegistration}
            battleForm={battleForm}
            efootballForm={efootballForm}
            efootballFixtures={selectableEfootballFixtures}
            selectedFixtureId={selectedFixtureId}
            screenshot={screenshot}
            uploading={uploading}
            onBattleFormChange={setBattleForm}
            onEfootballFormChange={setEfootballForm}
            onScreenshotChange={setScreenshot}
            onSubmit={handleUpload}
          />
          <MySubmissions submissions={activeSubmissions} />
          <PrizePanel activeGame={activeGame} payouts={state?.payouts ?? []} />
        </aside>
      </div>
    </div>
  );
}

function PlayerGameStatus({
  activeGame,
  registration,
  onCheckIn,
  acting,
}: {
  activeGame: OnlineTournamentGameKey;
  registration: OnlineTournamentPlayerState['myRegistrations'][number] | null;
  onCheckIn: () => Promise<void>;
  acting: string | null;
}) {
  const config = ONLINE_TOURNAMENT_GAME_BY_KEY[activeGame];
  const isCheckingIn = acting === `check-in-${activeGame}`;

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-title">{config.label}</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            {registration ? registration.in_game_username : 'No slot yet'}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {registration ? statusPill(registration.check_in_status) : null}
            {registration ? statusPill(registration.eligibility_status) : null}
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
              {config.format}
            </span>
          </div>
        </div>

        {registration ? (
          <button
            type="button"
            onClick={() => void onCheckIn()}
            disabled={isCheckingIn || registration.check_in_status === 'checked_in'}
            className="btn-primary justify-center"
          >
            {isCheckingIn ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            {registration.check_in_status === 'checked_in' ? 'Checked in' : 'Check in'}
          </button>
        ) : (
          <Link href={`${ONLINE_TOURNAMENT_REGISTRATION_PATH}?game=${activeGame}`} className="btn-primary justify-center">
            Register
          </Link>
        )}
      </div>
    </section>
  );
}

function BattleRoyaleRooms({ rooms }: { rooms: PlayerRoom[] }) {
  const roomByMatch = new Map(rooms.map((room) => [room.match_number, room]));

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Rooms</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Match credentials</h2>
        </div>
        <LockKeyhole size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.map((matchNumber) => {
          const room = roomByMatch.get(matchNumber);

          return (
            <div
              key={matchNumber}
              className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-[var(--text-primary)]">Match {matchNumber}</p>
                {statusPill(room?.status ?? 'draft')}
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--text-soft)]">
                {room?.map_name ?? room?.title ?? 'Map TBA'}
              </p>
              <div className="mt-3 space-y-2">
                <RoomCredential label="Room ID" value={room?.room_id} released={room?.credentials_released} />
                <RoomCredential label="Password" value={room?.room_password} released={room?.credentials_released} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
                {room?.starts_at ? formatDateTime(room.starts_at) : 'Start time follows match desk.'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoomCredential({
  label,
  value,
  released,
}: {
  label: string;
  value: string | null | undefined;
  released: boolean | undefined;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-[var(--text-primary)]">
        {released ? value || 'TBA' : 'Locked'}
      </p>
    </div>
  );
}

function BattleRoyaleStandings({
  standings,
}: {
  standings: OnlineTournamentSafeStanding[];
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Standings</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Verified leaderboard</h2>
        </div>
        <Trophy size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)]">
        {standings.length === 0 ? (
          <div className="p-5 text-sm text-[var(--text-secondary)]">No standings yet.</div>
        ) : (
          standings.slice(0, 20).map((standing, index) => (
            <div
              key={standing.registration.id}
              className={`grid grid-cols-[54px_minmax(0,1fr)_86px] items-center gap-3 px-4 py-3 ${
                index > 0 ? 'border-t border-[var(--border-color)]' : ''
              }`}
            >
              <p className="text-sm font-black text-[var(--text-primary)]">#{standing.rank}</p>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--text-primary)]">
                  {standing.registration.in_game_username}
                </p>
                <p className="text-xs text-[var(--text-soft)]">
                  M1 {standing.matchKills[1]} | M2 {standing.matchKills[2]} | M3 {standing.matchKills[3]}
                </p>
              </div>
              <p className="text-right text-sm font-black text-[var(--accent-secondary-text)]">
                {standing.totalKills} kills
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EfootballBracket({
  fixtures,
  myRegistrationIds,
}: {
  fixtures: OnlineTournamentSafeFixture[];
  myRegistrationIds: Set<string>;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Bracket</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">eFootball fixtures</h2>
        </div>
        <Swords size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {fixtures.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)]">
            Bracket has not been seeded yet.
          </div>
        ) : (
          fixtures.map((fixture) => {
            const isMine =
              Boolean(fixture.player1?.id && myRegistrationIds.has(fixture.player1.id)) ||
              Boolean(fixture.player2?.id && myRegistrationIds.has(fixture.player2.id));

            return (
              <div
                key={fixture.id}
                className={`rounded-[var(--radius-card)] border p-4 ${
                  isMine
                    ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.07)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {fixture.round_label} #{fixture.slot + 1}
                  </p>
                  {statusPill(fixture.status)}
                </div>
                <FixturePlayer
                  name={getPlayerName(fixture.player1)}
                  score={fixture.player1_score}
                  winner={fixture.winner_registration_id === fixture.player1_registration_id}
                />
                <FixturePlayer
                  name={getPlayerName(fixture.player2)}
                  score={fixture.player2_score}
                  winner={fixture.winner_registration_id === fixture.player2_registration_id}
                />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function FixturePlayer({
  name,
  score,
  winner,
}: {
  name: string;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
      <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
      <div className="flex items-center gap-2">
        {winner ? <Medal size={14} className="text-[var(--accent-secondary-text)]" /> : null}
        <span className="text-sm font-black text-[var(--text-primary)]">
          {score ?? '-'}
        </span>
      </div>
    </div>
  );
}

function ResultUploadPanel({
  activeGame,
  registration,
  battleForm,
  efootballForm,
  efootballFixtures,
  selectedFixtureId,
  screenshot,
  uploading,
  onBattleFormChange,
  onEfootballFormChange,
  onScreenshotChange,
  onSubmit,
}: {
  activeGame: OnlineTournamentGameKey;
  registration: OnlineTournamentPlayerState['myRegistrations'][number] | null;
  battleForm: { matchNumber: string; kills: string; placement: string };
  efootballForm: { fixtureId: string; player1Score: string; player2Score: string };
  efootballFixtures: OnlineTournamentSafeFixture[];
  selectedFixtureId: string;
  screenshot: File | null;
  uploading: boolean;
  onBattleFormChange: (value: { matchNumber: string; kills: string; placement: string }) => void;
  onEfootballFormChange: (value: { fixtureId: string; player1Score: string; player2Score: string }) => void;
  onScreenshotChange: (value: File | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Results</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Upload screenshot</h2>
        </div>
        <Upload size={18} className="text-[var(--text-soft)]" />
      </div>

      {!registration ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
          Register for this game before uploading scores.
        </div>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
          {isBattleRoyaleTournamentGame(activeGame) ? (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Match</span>
                <select
                  value={battleForm.matchNumber}
                  onChange={(event) =>
                    onBattleFormChange({ ...battleForm, matchNumber: event.target.value })
                  }
                  className="input mt-1"
                >
                  {ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.map((matchNumber) => (
                    <option key={matchNumber} value={String(matchNumber)}>
                      Match {matchNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Kills</span>
                <input
                  type="number"
                  min="0"
                  value={battleForm.kills}
                  onChange={(event) =>
                    onBattleFormChange({ ...battleForm, kills: event.target.value })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Placement</span>
                <input
                  type="number"
                  min="1"
                  value={battleForm.placement}
                  onChange={(event) =>
                    onBattleFormChange({ ...battleForm, placement: event.target.value })
                  }
                  className="input mt-1"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Fixture</span>
                <select
                  value={selectedFixtureId}
                  onChange={(event) =>
                    onEfootballFormChange({ ...efootballForm, fixtureId: event.target.value })
                  }
                  className="input mt-1"
                >
                  {efootballFixtures.length === 0 ? (
                    <option value="">No active fixture</option>
                  ) : (
                    efootballFixtures.map((fixture) => (
                      <option key={fixture.id} value={fixture.id}>
                        {fixture.round_label} #{fixture.slot + 1}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-[var(--text-soft)]">Player 1</span>
                  <input
                    type="number"
                    min="0"
                    value={efootballForm.player1Score}
                    onChange={(event) =>
                      onEfootballFormChange({ ...efootballForm, player1Score: event.target.value })
                    }
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--text-soft)]">Player 2</span>
                  <input
                    type="number"
                    min="0"
                    value={efootballForm.player2Score}
                    onChange={(event) =>
                      onEfootballFormChange({ ...efootballForm, player2Score: event.target.value })
                    }
                    className="input mt-1"
                  />
                </label>
              </div>
            </div>
          )}

          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-5 text-center">
            <ImageIcon size={20} className="text-[var(--text-soft)]" />
            <span className="max-w-full truncate text-sm font-semibold text-[var(--text-primary)]">
              {screenshot ? screenshot.name : 'Screenshot file'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onScreenshotChange(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="btn-primary w-full justify-center"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Submit for review
          </button>
        </form>
      )}
    </section>
  );
}

function MySubmissions({ submissions }: { submissions: ResultSubmission[] }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Submissions</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">My review queue</h2>
        </div>
        <ShieldCheck size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 space-y-3">
        {submissions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No screenshots submitted yet.</p>
        ) : (
          submissions.slice(0, 6).map((submission) => (
            <div
              key={submission.id}
              className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-[var(--text-primary)]">
                  {getSubmissionLabel(submission)}
                </p>
                {statusPill(submission.status)}
              </div>
              <p className="mt-2 text-xs text-[var(--text-soft)]">
                {formatDateTime(submission.created_at)}
              </p>
              {submission.admin_note ? (
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {submission.admin_note}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PrizePanel({
  activeGame,
  payouts,
}: {
  activeGame: OnlineTournamentGameKey;
  payouts: OnlineTournamentPlayerState['payouts'];
}) {
  const prizes = getGamePrizeLabels(activeGame);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Rewards</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Prize desk</h2>
        </div>
        <Medal size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 space-y-3">
        {prizes.map((prize, index) => {
          const payout = payouts.find(
            (item) => item.game === activeGame && item.placement === index + 1
          );

          return (
            <div
              key={`${activeGame}-${index}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">#{index + 1}</p>
                <p className="text-xs text-[var(--text-secondary)]">{payout?.prize_label ?? prize}</p>
              </div>
              {payout ? statusPill(payout.payout_status) : (
                <AlertCircle size={15} className="text-[var(--text-soft)]" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getSubmissionLabel(submission: ResultSubmission) {
  if (submission.match_number) {
    return `Match ${submission.match_number}: ${submission.kills ?? 0} kills, #${submission.placement ?? '-'}`;
  }

  if (submission.player1_score !== null && submission.player2_score !== null) {
    return `${submission.player1_score}-${submission.player2_score}`;
  }

  return formatStatus(submission.status);
}
