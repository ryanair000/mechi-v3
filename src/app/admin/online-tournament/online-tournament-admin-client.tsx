'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Loader2,
  Medal,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Swords,
  Trophy,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_TITLE,
  type OnlineTournamentCheckInStatus,
  type OnlineTournamentEligibilityStatus,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  ONLINE_TOURNAMENT_BR_MATCH_NUMBERS,
  getGamePrizeLabels,
  type OnlineTournamentBattleRoyaleGameKey,
  type OnlineTournamentResultStatus,
  type OnlineTournamentRoomStatus,
} from '@/lib/online-tournament-ops';

type OnlineTournamentRegistration = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  available_at_8pm: boolean;
  accepted_rules: boolean;
  reward_eligible: boolean;
  eligibility_status: OnlineTournamentEligibilityStatus;
  check_in_status: OnlineTournamentCheckInStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    phone?: string | null;
    email?: string | null;
  } | null;
};

const API_PATH = '/api/admin/online-tournament-registrations';
const OPS_API_PATH = '/api/admin/online-tournament-ops';
const GAME_FILTERS = ['all', ...ONLINE_TOURNAMENT_GAMES.map((game) => game.game)] as const;
const ROOM_STATUSES: OnlineTournamentRoomStatus[] = [
  'draft',
  'released',
  'locked',
  'completed',
  'cancelled',
];

type OnlineTournamentRoom = {
  id: string;
  game: OnlineTournamentBattleRoyaleGameKey;
  match_number: number;
  title: string | null;
  map_name: string | null;
  room_id: string | null;
  room_password: string | null;
  instructions: string | null;
  starts_at: string | null;
  release_at: string | null;
  status: OnlineTournamentRoomStatus;
};

type OnlineTournamentFixture = {
  id: string;
  round: string;
  round_label: string;
  slot: number;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_registration_id: string | null;
  status: string;
};

type OnlineTournamentSubmission = {
  id: string;
  game: OnlineTournamentGameKey;
  registration_id: string | null;
  fixture_id: string | null;
  match_number: number | null;
  kills: number | null;
  placement: number | null;
  player1_score: number | null;
  player2_score: number | null;
  screenshot_url: string | null;
  status: OnlineTournamentResultStatus;
  admin_note: string | null;
  created_at: string;
  registration?: {
    id: string;
    in_game_username: string;
    game: OnlineTournamentGameKey;
    user_id: string;
  } | null;
};

type OnlineTournamentStanding = {
  rank: number;
  registration: OnlineTournamentRegistration;
  totalKills: number;
  matchKills: Record<1 | 2 | 3, number>;
  finalMatchPlacement: number | null;
  verifiedSubmissionCount: number;
};

type OnlineTournamentPayout = {
  id: string;
  game: OnlineTournamentGameKey;
  placement: number;
  registration_id: string | null;
  prize_label: string;
  payout_status: string;
};

type OnlineTournamentOpsState = {
  registrations: OnlineTournamentRegistration[];
  rooms: OnlineTournamentRoom[];
  fixtures: OnlineTournamentFixture[];
  submissions: OnlineTournamentSubmission[];
  payouts: OnlineTournamentPayout[];
  standings: Record<OnlineTournamentBattleRoyaleGameKey, OnlineTournamentStanding[]>;
};

type RoomDraft = {
  title: string;
  map_name: string;
  room_id: string;
  room_password: string;
  instructions: string;
  starts_at: string;
  release_at: string;
  status: OnlineTournamentRoomStatus;
};

function getRoomKey(game: OnlineTournamentBattleRoyaleGameKey, matchNumber: number) {
  return `${game}-${matchNumber}`;
}

function getDefaultRoomDraft(): RoomDraft {
  return {
    title: '',
    map_name: '',
    room_id: '',
    room_password: '',
    instructions: '',
    starts_at: '',
    release_at: '',
    status: 'draft',
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'TBA';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'TBA';
  }
}

function getRegistrationName(
  registrationsById: Map<string, OnlineTournamentRegistration>,
  id: string | null
) {
  if (!id) return 'TBA';
  const registration = registrationsById.get(id);
  return registration?.in_game_username ?? registration?.user?.username ?? 'Unknown player';
}

function getSubmissionLabel(submission: OnlineTournamentSubmission) {
  const player = submission.registration?.in_game_username ?? 'Unknown player';

  if (submission.match_number) {
    return `${player} | Match ${submission.match_number} | ${submission.kills ?? 0} kills | #${
      submission.placement ?? '-'
    }`;
  }

  if (submission.player1_score !== null && submission.player2_score !== null) {
    return `${player} | ${submission.player1_score}-${submission.player2_score}`;
  }

  return player;
}

function getEligibilityClassName(status: OnlineTournamentEligibilityStatus) {
  switch (status) {
    case 'verified':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'ineligible':
    case 'disqualified':
      return 'bg-red-500/14 text-red-300';
    case 'pending':
    default:
      return 'bg-amber-500/14 text-amber-300';
  }
}

function getCheckInClassName(status: OnlineTournamentCheckInStatus) {
  switch (status) {
    case 'checked_in':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'no_show':
      return 'bg-red-500/14 text-red-300';
    case 'registered':
    default:
      return 'bg-[var(--surface)] text-[var(--text-secondary)]';
  }
}

export function OnlineTournamentAdminClient() {
  const authFetch = useAuthFetch();
  const [registrations, setRegistrations] = useState<OnlineTournamentRegistration[]>([]);
  const [opsState, setOpsState] = useState<OnlineTournamentOpsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<(typeof GAME_FILTERS)[number]>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [roomDrafts, setRoomDrafts] = useState<Record<string, RoomDraft>>({});

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(API_PATH);
      const data = (await res.json()) as {
        registrations?: OnlineTournamentRegistration[];
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load registrations');
        setRegistrations([]);
        return;
      }

      const nextRegistrations = data.registrations ?? [];
      setRegistrations(nextRegistrations);
      setNotes(
        nextRegistrations.reduce<Record<string, string>>((nextNotes, registration) => {
          nextNotes[registration.id] = registration.admin_note ?? '';
          return nextNotes;
        }, {})
      );
    } catch {
      toast.error('Network error while loading registrations');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchOpsState = useCallback(async () => {
    setOpsLoading(true);
    try {
      const res = await authFetch(OPS_API_PATH);
      const data = (await res.json()) as OnlineTournamentOpsState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load tournament ops');
        setOpsState(null);
        return;
      }

      setOpsState(data);
      setRoomDrafts((current) => {
        const next: Record<string, RoomDraft> = { ...current };

        for (const game of ['pubgm', 'codm'] as OnlineTournamentBattleRoyaleGameKey[]) {
          for (const matchNumber of ONLINE_TOURNAMENT_BR_MATCH_NUMBERS) {
            const key = getRoomKey(game, matchNumber);
            const room = data.rooms.find(
              (item) => item.game === game && item.match_number === matchNumber
            );

            next[key] = {
              title: room?.title ?? '',
              map_name: room?.map_name ?? '',
              room_id: room?.room_id ?? '',
              room_password: room?.room_password ?? '',
              instructions: room?.instructions ?? '',
              starts_at: room?.starts_at ?? '',
              release_at: room?.release_at ?? '',
              status: room?.status ?? next[key]?.status ?? 'draft',
            };
          }
        }

        return next;
      });
    } catch {
      toast.error('Network error while loading tournament ops');
    } finally {
      setOpsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void fetchRegistrations();
    void fetchOpsState();
  }, [fetchOpsState, fetchRegistrations]);

  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return registrations.filter((registration) => {
      if (gameFilter !== 'all' && registration.game !== gameFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        registration.user?.username,
        registration.in_game_username,
        registration.phone,
        registration.whatsapp_number,
        registration.email,
        registration.instagram_username,
        registration.youtube_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [gameFilter, query, registrations]);

  const summary = useMemo(() => {
    const byGame = ONLINE_TOURNAMENT_GAMES.map((game) => {
      const gameRegistrations = registrations.filter(
        (registration) =>
          registration.game === game.game && registration.eligibility_status !== 'disqualified'
      );

      return {
        ...game,
        registered: gameRegistrations.length,
        verified: gameRegistrations.filter(
          (registration) => registration.eligibility_status === 'verified'
        ).length,
        pending: gameRegistrations.filter(
          (registration) => registration.eligibility_status === 'pending'
        ).length,
      };
    });

    return {
      total: byGame.reduce((total, game) => total + game.registered, 0),
      verified: byGame.reduce((total, game) => total + game.verified, 0),
      pending: byGame.reduce((total, game) => total + game.pending, 0),
      byGame,
    };
  }, [registrations]);

  const registrationsById = useMemo(
    () => new Map(registrations.map((registration) => [registration.id, registration])),
    [registrations]
  );

  const handleUpdate = async (
    registration: OnlineTournamentRegistration,
    updates: Partial<{
      eligibility_status: OnlineTournamentEligibilityStatus;
      check_in_status: OnlineTournamentCheckInStatus;
      admin_note: string | null;
    }>
  ) => {
    setActingOn(registration.id);
    try {
      const res = await authFetch(API_PATH, {
        method: 'PATCH',
        body: JSON.stringify({
          registration_id: registration.id,
          ...updates,
        }),
      });
      const data = (await res.json()) as {
        registrations?: OnlineTournamentRegistration[];
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not update registration');
        return;
      }

      setRegistrations(data.registrations ?? registrations);
      void fetchOpsState();
      toast.success('Registration updated');
    } catch {
      toast.error('Network error while updating registration');
    } finally {
      setActingOn(null);
    }
  };

  const handleRefreshAll = () => {
    void fetchRegistrations();
    void fetchOpsState();
  };

  const handleRoomDraftChange = (
    game: OnlineTournamentBattleRoyaleGameKey,
    matchNumber: number,
    updates: Partial<RoomDraft>
  ) => {
    const key = getRoomKey(game, matchNumber);
    setRoomDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? getDefaultRoomDraft()),
        ...updates,
      },
    }));
  };

  const handleOpsAction = async (
    actionKey: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    setActingOn(actionKey);
    try {
      const res = await authFetch(OPS_API_PATH, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as OnlineTournamentOpsState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not update tournament ops');
        return;
      }

      setOpsState(data);
      toast.success(successMessage);
    } catch {
      toast.error('Network error while updating tournament ops');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Online tournament control</p>
            <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              {ONLINE_TOURNAMENT_TITLE}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Use this lane as the official registration source: player list, social verification,
              check-ins, reward eligibility, and admin notes.
            </p>
          </div>

          <button type="button" onClick={handleRefreshAll} className="btn-ghost">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Registered', value: summary.total, icon: Trophy },
            { label: 'Verified rewards', value: summary.verified, icon: CheckCircle2 },
            { label: 'Pending review', value: summary.pending, icon: ShieldAlert },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4"
              >
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <Icon size={15} />
                  <p className="text-xs font-bold">{item.label}</p>
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  {item.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {summary.byGame.map((game) => (
            <div
              key={game.game}
              className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[var(--text-primary)]">{game.label}</p>
                <span className="brand-chip px-2.5 py-1">
                  {game.registered}/{game.slots}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
                <div
                  className="h-full bg-[var(--brand-teal)]"
                  style={{ width: `${Math.min(100, (game.registered / game.slots) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {game.verified} verified, {game.pending} pending
              </p>
            </div>
          ))}
        </div>
      </section>

      <OpsControlPanel
        actingOn={actingOn}
        loading={opsLoading}
        opsState={opsState}
        registrationsById={registrationsById}
        roomDrafts={roomDrafts}
        onOpsAction={handleOpsAction}
        onRoomDraftChange={handleRoomDraftChange}
      />

      <section className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search player, phone, email, tag, Instagram, or YouTube"
            />
          </label>

          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value as typeof gameFilter)}
            className="input"
          >
            {GAME_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {filter === 'all' ? 'All games' : ONLINE_TOURNAMENT_GAME_BY_KEY[filter].label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 shimmer rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="card p-10 text-center">
          <Trophy size={26} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
            No registrations match this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRegistrations.map((registration) => {
            const game = ONLINE_TOURNAMENT_GAME_BY_KEY[registration.game];
            const isActing = actingOn === registration.id;
            const socialComplete =
              registration.followed_instagram && registration.subscribed_youtube;

            return (
              <div key={registration.id} className="card p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {registration.user?.username ?? 'Unknown player'}
                      </p>
                      <span className="brand-chip px-2.5 py-1">{game.label}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${getEligibilityClassName(
                          registration.eligibility_status
                        )}`}
                      >
                        {registration.eligibility_status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${getCheckInClassName(
                          registration.check_in_status
                        )}`}
                      >
                        {registration.check_in_status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {[
                        ['Game tag', registration.in_game_username],
                        ['Phone', registration.whatsapp_number ?? registration.phone ?? 'No phone'],
                        ['Email', registration.email ?? registration.user?.email ?? 'No email'],
                        ['Registered', new Date(registration.created_at).toLocaleString()],
                        [
                          'Instagram',
                          registration.instagram_username
                            ? `@${registration.instagram_username}`
                            : 'Not provided',
                        ],
                        ['YouTube', registration.youtube_name ?? 'Not provided'],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5"
                        >
                          <p className="text-xs text-[var(--text-soft)]">{label}</p>
                          <p className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={socialComplete ? 'brand-chip px-2.5 py-1' : 'brand-chip-coral px-2.5 py-1'}>
                        {socialComplete ? 'Social self-check complete' : 'Social requirement incomplete'}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                        Available at 8 PM: {registration.available_at_8pm ? 'Yes' : 'No'}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                        Rules accepted: {registration.accepted_rules ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <p className="section-title">Admin actions</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() =>
                            void handleUpdate(registration, { eligibility_status: 'verified' })
                          }
                          className="btn-primary justify-center"
                        >
                          {isActing ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                          Verify reward
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() =>
                            void handleUpdate(registration, { eligibility_status: 'ineligible' })
                          }
                          className="btn-ghost justify-center"
                        >
                          <ShieldAlert size={14} />
                          Mark ineligible
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() =>
                            void handleUpdate(registration, { eligibility_status: 'disqualified' })
                          }
                          className="btn-ghost justify-center text-red-300 hover:text-red-200"
                        >
                          <UserX size={14} />
                          Disqualify
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <p className="section-title">Check-in</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(['registered', 'checked_in', 'no_show'] as OnlineTournamentCheckInStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={isActing}
                              onClick={() => void handleUpdate(registration, { check_in_status: status })}
                              className={`min-h-10 rounded-md border px-2 py-2 text-xs font-bold ${
                                registration.check_in_status === status
                                  ? 'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <p className="section-title">Admin note</p>
                      <textarea
                        value={notes[registration.id] ?? ''}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [registration.id]: event.target.value,
                          }))
                        }
                        className="input mt-3 min-h-24 resize-y"
                        placeholder="Social proof, dispute note, payout note..."
                      />
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() =>
                          void handleUpdate(registration, {
                            admin_note: notes[registration.id] ?? '',
                          })
                        }
                        className="btn-ghost mt-3 w-full justify-center"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpsControlPanel({
  actingOn,
  loading,
  opsState,
  registrationsById,
  roomDrafts,
  onOpsAction,
  onRoomDraftChange,
}: {
  actingOn: string | null;
  loading: boolean;
  opsState: OnlineTournamentOpsState | null;
  registrationsById: Map<string, OnlineTournamentRegistration>;
  roomDrafts: Record<string, RoomDraft>;
  onOpsAction: (
    actionKey: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => Promise<void>;
  onRoomDraftChange: (
    game: OnlineTournamentBattleRoyaleGameKey,
    matchNumber: number,
    updates: Partial<RoomDraft>
  ) => void;
}) {
  if (loading) {
    return (
      <section className="card p-5">
        <div className="h-44 shimmer rounded-[var(--radius-card)]" />
      </section>
    );
  }

  if (!opsState) {
    return (
      <section className="card p-5">
        <p className="text-sm text-[var(--text-secondary)]">Tournament ops could not load.</p>
      </section>
    );
  }

  const pendingSubmissions = opsState.submissions.filter(
    (submission) => submission.status === 'pending'
  );

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="section-title">Tournament run desk</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            Rooms, brackets, results, and payouts
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            This is the live control lane for PlayMechi after registration closes.
          </p>
        </div>

        <button
          type="button"
          disabled={actingOn === 'seed-efootball'}
          onClick={() =>
            void onOpsAction(
              'seed-efootball',
              { action: 'seed_efootball' },
              'eFootball bracket seeded'
            )
          }
          className="btn-primary justify-center"
        >
          {actingOn === 'seed-efootball' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Swords size={14} />
          )}
          Seed eFootball
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <RoomDesk
            actingOn={actingOn}
            roomDrafts={roomDrafts}
            onOpsAction={onOpsAction}
            onRoomDraftChange={onRoomDraftChange}
          />
          <ResultReviewDesk
            actingOn={actingOn}
            submissions={pendingSubmissions.length > 0 ? pendingSubmissions : opsState.submissions.slice(0, 8)}
            onOpsAction={onOpsAction}
          />
        </div>

        <div className="space-y-4">
          <StandingsDesk opsState={opsState} />
          <EfootballDesk fixtures={opsState.fixtures} registrationsById={registrationsById} />
          <PayoutDesk opsState={opsState} registrationsById={registrationsById} />
        </div>
      </div>
    </section>
  );
}

function RoomDesk({
  actingOn,
  roomDrafts,
  onOpsAction,
  onRoomDraftChange,
}: {
  actingOn: string | null;
  roomDrafts: Record<string, RoomDraft>;
  onOpsAction: (
    actionKey: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => Promise<void>;
  onRoomDraftChange: (
    game: OnlineTournamentBattleRoyaleGameKey,
    matchNumber: number,
    updates: Partial<RoomDraft>
  ) => void;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">PUBG / CODM</p>
          <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Room credentials</h3>
        </div>
        <ShieldAlert size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 grid gap-3 2xl:grid-cols-2">
        {(['pubgm', 'codm'] as OnlineTournamentBattleRoyaleGameKey[]).flatMap((game) =>
          ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.map((matchNumber) => {
            const key = getRoomKey(game, matchNumber);
            const draft = roomDrafts[key] ?? getDefaultRoomDraft();
            const actionKey = `room-${key}`;

            return (
              <div
                key={key}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    {ONLINE_TOURNAMENT_GAME_BY_KEY[game].shortLabel} match {matchNumber}
                  </p>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      onRoomDraftChange(game, matchNumber, {
                        status: event.target.value as OnlineTournamentRoomStatus,
                      })
                    }
                    className="min-h-9 rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2 text-xs font-bold text-[var(--text-primary)]"
                  >
                    {ROOM_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    value={draft.room_id}
                    onChange={(event) =>
                      onRoomDraftChange(game, matchNumber, { room_id: event.target.value })
                    }
                    className="input"
                    placeholder="Room ID"
                  />
                  <input
                    value={draft.room_password}
                    onChange={(event) =>
                      onRoomDraftChange(game, matchNumber, { room_password: event.target.value })
                    }
                    className="input"
                    placeholder="Password"
                  />
                  <input
                    value={draft.map_name}
                    onChange={(event) =>
                      onRoomDraftChange(game, matchNumber, { map_name: event.target.value })
                    }
                    className="input"
                    placeholder="Map"
                  />
                  <input
                    value={draft.starts_at}
                    onChange={(event) =>
                      onRoomDraftChange(game, matchNumber, { starts_at: event.target.value })
                    }
                    className="input"
                    placeholder="Starts at"
                  />
                </div>

                <textarea
                  value={draft.instructions}
                  onChange={(event) =>
                    onRoomDraftChange(game, matchNumber, { instructions: event.target.value })
                  }
                  className="input mt-2 min-h-20 resize-y"
                  placeholder="Room note"
                />

                <button
                  type="button"
                  disabled={actingOn === actionKey}
                  onClick={() =>
                    void onOpsAction(
                      actionKey,
                      {
                        action: 'upsert_room',
                        game,
                        match_number: matchNumber,
                        title: draft.title,
                        map_name: draft.map_name,
                        room_id: draft.room_id,
                        room_password: draft.room_password,
                        instructions: draft.instructions,
                        starts_at: draft.starts_at,
                        release_at: draft.release_at,
                        status: draft.status,
                      },
                      'Room saved'
                    )
                  }
                  className="btn-ghost mt-3 w-full justify-center"
                >
                  {actingOn === actionKey ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save room
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ResultReviewDesk({
  actingOn,
  submissions,
  onOpsAction,
}: {
  actingOn: string | null;
  submissions: OnlineTournamentSubmission[];
  onOpsAction: (
    actionKey: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Screenshots</p>
          <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Result review</h3>
        </div>
        <Trophy size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 space-y-3">
        {submissions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No submissions yet.</p>
        ) : (
          submissions.map((submission) => {
            const verifyKey = `verify-${submission.id}`;
            const rejectKey = `reject-${submission.id}`;

            return (
              <div
                key={submission.id}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {getSubmissionLabel(submission)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {ONLINE_TOURNAMENT_GAME_BY_KEY[submission.game].shortLabel} |{' '}
                      {formatDateTime(submission.created_at)} | {submission.status}
                    </p>
                    {submission.screenshot_url ? (
                      <a
                        href={submission.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-bold text-[var(--accent-secondary-text)] hover:underline"
                      >
                        Open screenshot
                      </a>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actingOn === verifyKey}
                      onClick={() =>
                        void onOpsAction(
                          verifyKey,
                          {
                            action: 'set_result_status',
                            submission_id: submission.id,
                            status: 'verified',
                          },
                          'Result verified'
                        )
                      }
                      className="btn-primary min-h-9 px-3 py-2 text-xs"
                    >
                      {actingOn === verifyKey ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={actingOn === rejectKey}
                      onClick={() =>
                        void onOpsAction(
                          rejectKey,
                          {
                            action: 'set_result_status',
                            submission_id: submission.id,
                            status: 'rejected',
                          },
                          'Result rejected'
                        )
                      }
                      className="btn-ghost min-h-9 px-3 py-2 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StandingsDesk({ opsState }: { opsState: OnlineTournamentOpsState }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <p className="section-title">Standings</p>
      <div className="mt-4 space-y-4">
        {(['pubgm', 'codm'] as OnlineTournamentBattleRoyaleGameKey[]).map((game) => (
          <div key={game}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                {ONLINE_TOURNAMENT_GAME_BY_KEY[game].label}
              </h3>
              <span className="brand-chip px-2.5 py-1">
                {opsState.standings[game]?.length ?? 0}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {(opsState.standings[game] ?? []).slice(0, 5).map((standing) => (
                <div
                  key={standing.registration.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
                >
                  <p className="min-w-0 truncate text-xs font-bold text-[var(--text-primary)]">
                    #{standing.rank} {standing.registration.in_game_username}
                  </p>
                  <p className="text-xs font-black text-[var(--accent-secondary-text)]">
                    {standing.totalKills} kills
                  </p>
                </div>
              ))}
              {(opsState.standings[game] ?? []).length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">No verified results yet.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EfootballDesk({
  fixtures,
  registrationsById,
}: {
  fixtures: OnlineTournamentFixture[];
  registrationsById: Map<string, OnlineTournamentRegistration>;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <p className="section-title">eFootball bracket</p>
      <div className="mt-4 space-y-2">
        {fixtures.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Bracket has not been seeded yet.</p>
        ) : (
          fixtures.slice(0, 10).map((fixture) => (
            <div
              key={fixture.id}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--text-soft)]">
                  {fixture.round_label} #{fixture.slot + 1}
                </p>
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {fixture.status}
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                {getRegistrationName(registrationsById, fixture.player1_registration_id)}{' '}
                {fixture.player1_score ?? '-'} vs {fixture.player2_score ?? '-'}{' '}
                {getRegistrationName(registrationsById, fixture.player2_registration_id)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PayoutDesk({
  opsState,
  registrationsById,
}: {
  opsState: OnlineTournamentOpsState;
  registrationsById: Map<string, OnlineTournamentRegistration>;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Payouts</p>
          <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Reward status</h3>
        </div>
        <Medal size={18} className="text-[var(--text-soft)]" />
      </div>

      <div className="mt-4 space-y-3">
        {ONLINE_TOURNAMENT_GAMES.flatMap((game) =>
          getGamePrizeLabels(game.game).map((prize, index) => {
            const placement = index + 1;
            const payout = opsState.payouts.find(
              (item) => item.game === game.game && item.placement === placement
            );

            return (
              <div
                key={`${game.game}-${placement}`}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[var(--text-primary)]">
                    {game.shortLabel} #{placement}
                  </p>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    {payout?.payout_status ?? 'pending'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {payout?.prize_label ?? prize} |{' '}
                  {getRegistrationName(registrationsById, payout?.registration_id ?? null)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
