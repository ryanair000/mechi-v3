'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Ban,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  DoorOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  filterCodmModeratorRoster,
  getCodmModeratorRosterCounts,
  isCodmReadyCheckedIn,
  needsCodmRosterAttention,
  type CodmModeratorRosterMode,
} from '@/lib/codm-moderator-roster';
import {
  ONLINE_TOURNAMENT_CHECK_IN_PATH,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  type OnlineTournamentCheckInStatus,
  type OnlineTournamentEligibilityStatus,
} from '@/lib/online-tournament';
import {
  ONLINE_TOURNAMENT_BR_MATCH_NUMBERS,
  formatOnlineTournamentLobby,
  type OnlineTournamentBattleRoyaleStanding,
  type OnlineTournamentRegistrationOpsRow,
  type OnlineTournamentResultStatus,
  type OnlineTournamentResultSubmission,
  type OnlineTournamentRoom,
  type OnlineTournamentRoomStatus,
} from '@/lib/online-tournament-ops';

const GAME = 'codm' as const;
const OPS_API_PATH = '/api/moderators/online-tournament-ops';
const REGISTRATION_API_PATH = '/api/moderators/online-tournament-registrations';
const USER_API_BASE_PATH = '/api/moderators/users';
const CHECK_IN_PATH = `${ONLINE_TOURNAMENT_CHECK_IN_PATH}?game=${GAME}`;
const ROOM_STATUSES: OnlineTournamentRoomStatus[] = [
  'draft',
  'released',
  'locked',
  'completed',
  'cancelled',
];
const RESULT_STATUSES: OnlineTournamentResultStatus[] = [
  'pending',
  'verified',
  'rejected',
  'disputed',
];

type TournamentOpsState = {
  registrations: OnlineTournamentRegistrationOpsRow[];
  rooms: OnlineTournamentRoom[];
  submissions: OnlineTournamentResultSubmission[];
  standings: Record<'pubgm' | 'codm', OnlineTournamentBattleRoyaleStanding[]>;
};

type RoomDraft = {
  map_name: string;
  room_id: string;
  room_password: string;
  instructions: string;
  starts_at: string;
  release_at: string;
  status: OnlineTournamentRoomStatus;
};

function getEmptyRoomDraft(): RoomDraft {
  return {
    map_name: '',
    room_id: '',
    room_password: '',
    instructions: '',
    starts_at: '',
    release_at: '',
    status: 'draft',
  };
}

function getRoomKey(matchNumber: number) {
  return `${GAME}-${matchNumber}`;
}

function formatStatus(value: string | null | undefined) {
  return String(value ?? 'pending').replaceAll('_', ' ');
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

function getBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'checked_in':
    case 'verified':
    case 'released':
    case 'completed':
      return 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]';
    case 'no_show':
    case 'disqualified':
    case 'ineligible':
    case 'rejected':
    case 'cancelled':
      return 'border-red-400/20 bg-red-500/10 text-red-300';
    case 'pending':
    case 'draft':
    case 'registered':
    default:
      return 'border-amber-400/20 bg-amber-500/10 text-amber-200';
  }
}

function getPlayerLabel(registration: OnlineTournamentRegistrationOpsRow | null | undefined) {
  if (!registration) return 'Unknown player';
  return registration.in_game_username || registration.user?.username || 'Unknown player';
}

function getSubmissionTitle(submission: OnlineTournamentResultSubmission) {
  const player = submission.registration?.in_game_username ?? 'Unknown player';
  return `${player} | Match ${submission.match_number ?? '-'} | ${submission.kills ?? 0} kills | #${
    submission.placement ?? '-'
  }`;
}

function buildRoomDrafts(state: TournamentOpsState) {
  const drafts: Record<string, RoomDraft> = {};

  for (const matchNumber of ONLINE_TOURNAMENT_BR_MATCH_NUMBERS) {
    const room = state.rooms.find((item) => item.game === GAME && item.match_number === matchNumber);
    drafts[getRoomKey(matchNumber)] = {
      map_name: room?.map_name ?? '',
      room_id: room?.room_id ?? '',
      room_password: room?.room_password ?? '',
      instructions: room?.instructions ?? '',
      starts_at: room?.starts_at ?? '',
      release_at: room?.release_at ?? '',
      status: room?.status ?? 'draft',
    };
  }

  return drafts;
}

function buildLobbyClipboard(registrations: OnlineTournamentRegistrationOpsRow[]) {
  return registrations
    .map((registration) =>
      [
        formatOnlineTournamentLobby(registration),
        registration.in_game_username || registration.user?.username || 'Player',
        registration.game_uid ? `UID ${registration.game_uid}` : 'UID n/a',
        registration.whatsapp_number ? `WA ${registration.whatsapp_number}` : 'WA n/a',
      ].join(' | ')
    )
    .join('\n');
}

function StatusPill({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getBadgeClass(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function MetaPill({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'danger';
}) {
  const className =
    tone === 'danger'
      ? 'border-red-400/20 bg-red-500/10 text-red-300'
      : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]';

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${className}`}>
      {label}
    </span>
  );
}

export function CodmModeratorClient() {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<TournamentOpsState | null>(null);
  const [roomDrafts, setRoomDrafts] = useState<Record<string, RoomDraft>>({});
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [rosterMode, setRosterMode] = useState<CodmModeratorRosterMode>('checked_in');
  const [registrationNotes, setRegistrationNotes] = useState<Record<string, string>>({});
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({});

  const applyState = useCallback((nextState: TournamentOpsState) => {
    setState(nextState);
    setRoomDrafts(buildRoomDrafts(nextState));
    setRegistrationNotes((current) => ({
      ...nextState.registrations.reduce<Record<string, string>>((notes, registration) => {
        if (registration.game === GAME) {
          notes[registration.id] = current[registration.id] ?? registration.admin_note ?? '';
        }
        return notes;
      }, {}),
    }));
    setSubmissionNotes((current) => ({
      ...nextState.submissions.reduce<Record<string, string>>((notes, submission) => {
        if (submission.game === GAME) {
          notes[submission.id] = current[submission.id] ?? submission.admin_note ?? '';
        }
        return notes;
      }, {}),
    }));
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(OPS_API_PATH);
      const data = (await res.json()) as TournamentOpsState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load CODM desk');
        setState(null);
        return;
      }

      applyState(data);
    } catch {
      toast.error('Network error while loading CODM desk');
    } finally {
      setLoading(false);
    }
  }, [applyState, authFetch]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const registrations = useMemo(
    () => (state?.registrations ?? []).filter((registration) => registration.game === GAME),
    [state]
  );
  const submissions = useMemo(
    () => (state?.submissions ?? []).filter((submission) => submission.game === GAME),
    [state]
  );
  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending'),
    [submissions]
  );
  const rooms = useMemo(
    () => (state?.rooms ?? []).filter((room) => room.game === GAME),
    [state]
  );
  const standings = state?.standings.codm ?? [];
  const checkedInRoster = registrations.filter(
    (registration) => registration.check_in_status === 'checked_in'
  );
  const readyCheckedInRoster = registrations.filter(isCodmReadyCheckedIn);
  const attentionRoster = registrations.filter(needsCodmRosterAttention);
  const rosterCounts = getCodmModeratorRosterCounts(registrations);
  const rosterFilterOptions: Array<{
    label: string;
    mode: CodmModeratorRosterMode;
    count: number;
  }> = [
    { label: 'Checked In', mode: 'checked_in', count: rosterCounts.checked_in },
    { label: 'Needs Attention', mode: 'needs_attention', count: rosterCounts.needs_attention },
    { label: 'Registered', mode: 'registered', count: rosterCounts.registered },
    { label: 'All', mode: 'all', count: rosterCounts.all },
  ];
  const activeConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[GAME];

  const filteredRoster = useMemo(() => {
    return filterCodmModeratorRoster(registrations, rosterMode, query);
  }, [query, registrations, rosterMode]);

  const patchOps = async (
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
      const data = (await res.json()) as TournamentOpsState & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not update CODM desk');
        return;
      }

      applyState(data);
      toast.success(successMessage);
    } catch {
      toast.error('Network error while updating CODM desk');
    } finally {
      setActingOn(null);
    }
  };

  const patchRegistration = async (
    registration: OnlineTournamentRegistrationOpsRow,
    updates: Partial<{
      eligibility_status: OnlineTournamentEligibilityStatus;
      check_in_status: OnlineTournamentCheckInStatus;
      admin_note: string | null;
    }>
  ) => {
    setActingOn(registration.id);
    try {
      const res = await authFetch(REGISTRATION_API_PATH, {
        method: 'PATCH',
        body: JSON.stringify({
          registration_id: registration.id,
          ...updates,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not update player');
        return;
      }

      await loadState();
      toast.success('Player updated');
    } catch {
      toast.error('Network error while updating player');
    } finally {
      setActingOn(null);
    }
  };

  const patchUserAccount = async (
    registration: OnlineTournamentRegistrationOpsRow,
    action: 'ban' | 'unban'
  ) => {
    const actionKey = `account-${registration.id}`;
    const playerLabel = getPlayerLabel(registration);
    const isProtectedAccount = registration.user?.role && registration.user.role !== 'user';

    if (!registration.user_id) {
      toast.error('Player account is missing a user id');
      return;
    }

    if (isProtectedAccount) {
      toast.error('Staff accounts must be managed from the admin user panel');
      return;
    }

    if (action === 'ban') {
      const confirmed = window.confirm(`Ban ${playerLabel} from Mechi?`);
      if (!confirmed) {
        return;
      }
    } else {
      const confirmed = window.confirm(`Restore ${playerLabel}'s account?`);
      if (!confirmed) {
        return;
      }
    }

    const reason =
      action === 'ban'
        ? window.prompt(
            `Ban reason for ${playerLabel}`,
            'Moderator action from CODM desk'
          )?.trim() ?? ''
        : '';

    setActingOn(actionKey);
    try {
      const res = await authFetch(`${USER_API_BASE_PATH}/${registration.user_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reason: action === 'ban' ? reason || 'Moderator action from CODM desk' : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? `Could not ${action} player account`);
        return;
      }

      await loadState();
      toast.success(action === 'ban' ? 'Player banned' : 'Player restored');
    } catch {
      toast.error(`Network error while trying to ${action} player account`);
    } finally {
      setActingOn(null);
    }
  };

  const updateRoomDraft = (matchNumber: number, updates: Partial<RoomDraft>) => {
    const key = getRoomKey(matchNumber);
    setRoomDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? getEmptyRoomDraft()),
        ...updates,
      },
    }));
  };

  const saveRoom = (matchNumber: number) => {
    const key = getRoomKey(matchNumber);
    const draft = roomDrafts[key] ?? getEmptyRoomDraft();
    void patchOps(
      `room-${matchNumber}`,
      {
        action: 'upsert_room',
        game: GAME,
        match_number: matchNumber,
        map_name: draft.map_name,
        room_id: draft.room_id,
        room_password: draft.room_password,
        instructions: draft.instructions,
        starts_at: draft.starts_at,
        release_at: draft.release_at,
        status: draft.status,
      },
      `Match ${matchNumber} room saved`
    );
  };

  const copyLobby = async () => {
    const text = buildLobbyClipboard(readyCheckedInRoster);
    if (!text) {
      toast.error('No lobby-ready CODM players to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success('CODM lobby list copied');
    } catch {
      toast.error('Could not copy lobby list');
    }
  };

  return (
    <div className="space-y-4">
      <section className="border-b border-[var(--border-color)] pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">CODM moderator</p>
            <h1 className="mt-2 text-[1.45rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.9rem]">
              {activeConfig.label} desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Check-ins, lobby slots, room credentials, result review, and standings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={CHECK_IN_PATH} className="btn-ghost">
              <ClipboardCheck size={14} />
              Player check-in
            </Link>
            <button type="button" onClick={() => void copyLobby()} className="btn-ghost">
              <Clipboard size={14} />
              Copy lobby
            </button>
            <button
              type="button"
              onClick={() => void loadState()}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Registered', value: registrations.length, icon: Trophy },
          { label: 'Checked in', value: checkedInRoster.length, icon: UserCheck },
          { label: 'Lobby ready', value: readyCheckedInRoster.length, icon: DoorOpen },
          { label: 'Pending results', value: pendingSubmissions.length, icon: ShieldAlert },
          { label: 'Needs attention', value: attentionRoster.length, icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[var(--text-soft)]">
                <Icon size={14} />
                <p className="text-xs font-bold">{item.label}</p>
              </div>
              <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{item.value}</p>
            </div>
          );
        })}
      </section>

      {loading && !state ? (
        <div className="space-y-3">
          <div className="h-48 shimmer rounded-[var(--radius-card)]" />
          <div className="h-48 shimmer rounded-[var(--radius-card)]" />
        </div>
      ) : (
        <>
          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="section-title">Roster</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Check-in and lobby queue
                </h2>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block sm:w-72">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input pl-9"
                    placeholder="Search player, UID, device"
                  />
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-1">
                  {rosterFilterOptions.map(({ label, mode, count }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRosterMode(mode)}
                      aria-pressed={rosterMode === mode}
                      data-testid={`codm-roster-filter-${mode}`}
                      className={`min-h-9 rounded-md px-2 text-xs font-bold capitalize ${
                        rosterMode === mode
                          ? 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="ml-1 text-[var(--text-soft)]">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Lobby</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                        No CODM players match this view.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((registration) => {
                      const isActingRegistration = actingOn === registration.id;
                      const isActingAccount = actingOn === `account-${registration.id}`;
                      const isActing = isActingRegistration || isActingAccount;
                      const isProtectedAccount =
                        registration.user?.role === 'moderator' ||
                        registration.user?.role === 'admin';
                      const isBanned = Boolean(registration.user?.is_banned);
                      return (
                        <tr key={registration.id} className="bg-[var(--surface)]">
                          <td className="rounded-l-lg border-y border-l border-[var(--border-color)] px-3 py-3 align-top">
                            <p className="font-black text-[var(--text-primary)]">
                              {getPlayerLabel(registration)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                              UID {registration.game_uid || 'n/a'} | Serial{' '}
                              {registration.device_serial_last6 || 'n/a'}
                            </p>
                          </td>
                          <td className="border-y border-[var(--border-color)] px-3 py-3 align-top">
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {formatOnlineTournamentLobby(registration)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                              {registration.checked_in_at
                                ? formatDateTime(registration.checked_in_at)
                                : 'Not checked in'}
                            </p>
                          </td>
                          <td className="border-y border-[var(--border-color)] px-3 py-3 align-top">
                            <p className="max-w-[190px] break-words text-sm font-semibold text-[var(--text-primary)]">
                              {registration.device_model || 'n/a'}
                            </p>
                          </td>
                          <td className="border-y border-[var(--border-color)] px-3 py-3 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              <StatusPill status={registration.check_in_status} />
                              <StatusPill status={registration.eligibility_status} />
                              {isBanned ? <MetaPill label="banned" tone="danger" /> : null}
                              {isProtectedAccount ? (
                                <MetaPill label={registration.user?.role ?? 'staff'} />
                              ) : null}
                            </div>
                          </td>
                          <td className="rounded-r-lg border-y border-r border-[var(--border-color)] px-3 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() =>
                                  void patchRegistration(registration, {
                                    eligibility_status: 'verified',
                                  })
                                }
                                className="btn-primary min-h-9 px-3 py-2 text-xs"
                              >
                                {isActing ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                Verify
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() =>
                                  void patchRegistration(registration, {
                                    check_in_status:
                                      registration.check_in_status === 'no_show'
                                        ? 'registered'
                                        : 'no_show',
                                  })
                                }
                                className="btn-ghost min-h-9 px-3 py-2 text-xs"
                              >
                                {registration.check_in_status === 'no_show' ? (
                                  <UserCheck size={13} />
                                ) : (
                                  <UserX size={13} />
                                )}
                                {registration.check_in_status === 'no_show' ? 'Restore' : 'No-show'}
                              </button>
                              <button
                                type="button"
                                disabled={isActing || isProtectedAccount}
                                onClick={() =>
                                  void patchUserAccount(
                                    registration,
                                    isBanned ? 'unban' : 'ban'
                                  )
                                }
                                className={
                                  isBanned
                                    ? 'btn-ghost min-h-9 px-3 py-2 text-xs'
                                    : 'btn-ghost min-h-9 px-3 py-2 text-xs text-red-200'
                                }
                                title={
                                  isProtectedAccount
                                    ? 'Staff accounts are managed from the admin user panel'
                                    : undefined
                                }
                              >
                                {isActingAccount ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : isBanned ? (
                                  <ShieldCheck size={13} />
                                ) : (
                                  <Ban size={13} />
                                )}
                                {isBanned ? 'Unban' : 'Ban'}
                              </button>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <input
                                value={registrationNotes[registration.id] ?? ''}
                                onChange={(event) =>
                                  setRegistrationNotes((current) => ({
                                    ...current,
                                    [registration.id]: event.target.value,
                                  }))
                                }
                                className="input min-h-9 text-xs"
                                placeholder="Moderator note"
                              />
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() =>
                                  void patchRegistration(registration, {
                                    admin_note: registrationNotes[registration.id] ?? '',
                                  })
                                }
                                className="btn-ghost min-h-9 px-3 py-2 text-xs"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Rooms</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Match credentials
                </h2>
              </div>
              <span className="brand-chip px-2.5 py-1">{rooms.length}/3 saved</span>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.map((matchNumber) => {
                const key = getRoomKey(matchNumber);
                const draft = roomDrafts[key] ?? getEmptyRoomDraft();
                const actionKey = `room-${matchNumber}`;

                return (
                  <div
                    key={matchNumber}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          Match {matchNumber}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                          {draft.room_id ? `Room ${draft.room_id}` : 'Room not set'}
                        </p>
                      </div>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          updateRoomDraft(matchNumber, {
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

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <input
                        value={draft.room_id}
                        onChange={(event) => updateRoomDraft(matchNumber, { room_id: event.target.value })}
                        className="input"
                        placeholder="Room ID"
                      />
                      <input
                        value={draft.room_password}
                        onChange={(event) =>
                          updateRoomDraft(matchNumber, { room_password: event.target.value })
                        }
                        className="input"
                        placeholder="Password"
                      />
                      <input
                        value={draft.map_name}
                        onChange={(event) => updateRoomDraft(matchNumber, { map_name: event.target.value })}
                        className="input"
                        placeholder="Map"
                      />
                      <input
                        value={draft.starts_at}
                        onChange={(event) => updateRoomDraft(matchNumber, { starts_at: event.target.value })}
                        className="input"
                        placeholder="Starts at"
                      />
                    </div>
                    <input
                      value={draft.release_at}
                      onChange={(event) => updateRoomDraft(matchNumber, { release_at: event.target.value })}
                      className="input mt-2"
                      placeholder="Release at"
                    />
                    <textarea
                      value={draft.instructions}
                      onChange={(event) =>
                        updateRoomDraft(matchNumber, { instructions: event.target.value })
                      }
                      className="input mt-2 min-h-20 resize-y"
                      placeholder="Room note"
                    />
                    <button
                      type="button"
                      disabled={actingOn === actionKey}
                      onClick={() => saveRoom(matchNumber)}
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
              })}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Review</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                    Result submissions
                  </h2>
                </div>
                <span className="brand-chip px-2.5 py-1">
                  {pendingSubmissions.length} pending
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {(pendingSubmissions.length > 0 ? pendingSubmissions : submissions.slice(0, 8)).map(
                  (submission) => {
                    const actionBase = `submission-${submission.id}`;
                    return (
                      <div
                        key={submission.id}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-[var(--text-primary)]">
                              {getSubmissionTitle(submission)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                              {formatDateTime(submission.created_at)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusPill status={submission.status} />
                              {submission.screenshot_url ? (
                                <a
                                  href={submission.screenshot_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgba(50,224,196,0.2)] px-2.5 py-1 text-xs font-bold text-[var(--accent-secondary-text)]"
                                >
                                  <ExternalLink size={12} />
                                  Screenshot
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {RESULT_STATUSES.filter((status) => status !== 'pending').map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={actingOn === `${actionBase}-${status}`}
                                onClick={() =>
                                  void patchOps(
                                    `${actionBase}-${status}`,
                                    {
                                      action: 'set_result_status',
                                      submission_id: submission.id,
                                      status,
                                      admin_note: submissionNotes[submission.id] ?? '',
                                    },
                                    `Result marked ${status}`
                                  )
                                }
                                className={
                                  status === 'verified'
                                    ? 'btn-primary min-h-9 px-3 py-2 text-xs'
                                    : 'btn-ghost min-h-9 px-3 py-2 text-xs'
                                }
                              >
                                {actingOn === `${actionBase}-${status}` ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : status === 'verified' ? (
                                  <CheckCircle2 size={13} />
                                ) : status === 'rejected' ? (
                                  <XCircle size={13} />
                                ) : (
                                  <ShieldAlert size={13} />
                                )}
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          value={submissionNotes[submission.id] ?? ''}
                          onChange={(event) =>
                            setSubmissionNotes((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          className="input mt-3"
                          placeholder="Review note"
                        />
                      </div>
                    );
                  }
                )}
                {submissions.length === 0 ? (
                  <p className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
                    No CODM submissions yet.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Standings</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                    Verified kills
                  </h2>
                </div>
                <span className="brand-chip px-2.5 py-1">{standings.length}</span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      <th className="py-2 pr-3">Rank</th>
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2">Kills</th>
                      <th className="px-3 py-2">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.slice(0, 12).map((standing) => (
                      <tr key={standing.registration.id} className="border-b border-[var(--border-color)]">
                        <td className="py-3 pr-3 text-sm font-black text-[var(--accent-secondary-text)]">
                          #{standing.rank}
                        </td>
                        <td className="px-3 py-3">
                          <p className="max-w-[220px] truncate text-sm font-bold text-[var(--text-primary)]">
                            {getPlayerLabel(standing.registration)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-sm font-black text-[var(--text-primary)]">
                          {standing.totalKills}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                          {standing.matchKills[1]}/{standing.matchKills[2]}/{standing.matchKills[3]}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-[var(--text-secondary)]">
                          No verified CODM results yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
