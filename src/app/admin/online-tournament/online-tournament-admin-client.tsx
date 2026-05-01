'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
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
const GAME_FILTERS = ['all', ...ONLINE_TOURNAMENT_GAMES.map((game) => game.game)] as const;

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
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<(typeof GAME_FILTERS)[number]>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});

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

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

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
      toast.success('Registration updated');
    } catch {
      toast.error('Network error while updating registration');
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

          <button type="button" onClick={() => void fetchRegistrations()} className="btn-ghost">
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
