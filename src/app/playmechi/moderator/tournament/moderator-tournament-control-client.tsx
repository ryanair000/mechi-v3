'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Medal,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  DEFAULT_MODERATOR_TOURNAMENT_KEY,
  getModeratorTournamentByKey,
  getModeratorTournamentFromGameIds,
} from '@/lib/moderator-tournaments';
import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  getGamePrizeLabels,
  type OnlineTournamentDispute,
  type OnlineTournamentDisputeStatus,
  type OnlineTournamentFixture,
  type OnlineTournamentPayout,
  type OnlineTournamentPayoutStatus,
  type OnlineTournamentRegistrationOpsRow,
  type OnlineTournamentResultStatus,
  type OnlineTournamentResultSubmission,
} from '@/lib/online-tournament-ops';
import type { OnlineTournamentOpsDashboardState } from '@/lib/online-tournament-moderation';
import { OnlineTournamentArenaClient } from '@/app/playmechi/tournament/online-tournament-arena-client';

const OPS_API_PATH = '/api/moderators/online-tournament-ops';
const PAYOUT_ELIGIBILITY_STATUSES = ['pending', 'eligible', 'ineligible'] as const;
const PAYOUT_STATUSES: OnlineTournamentPayoutStatus[] = [
  'pending',
  'approved',
  'paid',
  'failed',
  'ineligible',
];
const RESULT_STATUSES: OnlineTournamentResultStatus[] = [
  'verified',
  'rejected',
  'disputed',
];
const DISPUTE_STATUSES: OnlineTournamentDisputeStatus[] = [
  'open',
  'resolved',
  'dismissed',
];

type TournamentOpsResponse = OnlineTournamentOpsDashboardState & {
  error?: string;
  ocr_scan_error?: string | null;
};

type FixtureDraft = {
  player1Score: string;
  player2Score: string;
  adminNote: string;
};

type DisputeDraft = {
  resolutionNote: string;
};

type PayoutDraft = {
  registrationId: string;
  prizeLabel: string;
  prizeValueKes: string;
  rewardType: 'cash' | 'uc' | 'cp' | 'coins';
  eligibilityStatus: (typeof PAYOUT_ELIGIBILITY_STATUSES)[number];
  payoutStatus: OnlineTournamentPayoutStatus;
  payoutRef: string;
  adminNote: string;
};

const EFOOTBALL_PAYOUT_PRESETS = [
  { prizeLabel: 'KSh 1,000', prizeValueKes: '1000', rewardType: 'cash' as const },
  { prizeLabel: 'KSh 500', prizeValueKes: '500', rewardType: 'cash' as const },
  { prizeLabel: '315 Coins', prizeValueKes: '', rewardType: 'coins' as const },
];
const FIXTURE_ROUND_ORDER: Record<OnlineTournamentFixture['round'], number> = {
  round_of_16: 1,
  quarterfinal: 2,
  semifinal: 3,
  final: 4,
  bronze: 5,
};

function getGameFromSearch(
  value: string | null,
  fallback: OnlineTournamentGameKey
): OnlineTournamentGameKey {
  if (value === 'pubgm' || value === 'codm' || value === 'efootball') {
    return value;
  }

  return fallback;
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

function getBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'verified':
    case 'resolved':
    case 'ready':
    case 'completed':
    case 'eligible':
    case 'approved':
    case 'paid':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'rejected':
    case 'dismissed':
    case 'disputed':
    case 'failed':
    case 'ineligible':
    case 'no_show':
    case 'disqualified':
      return 'bg-red-500/14 text-red-300';
    case 'bye':
      return 'bg-sky-500/14 text-sky-300';
    case 'open':
      return 'bg-amber-500/14 text-amber-300';
    case 'pending':
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

function StatusPill({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getBadgeClass(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getPlayerLabel(registration: OnlineTournamentRegistrationOpsRow | null | undefined) {
  return registration?.in_game_username || registration?.user?.username || 'TBA';
}

function getFixtureDrafts(fixtures: OnlineTournamentFixture[]) {
  return fixtures.reduce<Record<string, FixtureDraft>>((drafts, fixture) => {
    drafts[fixture.id] = {
      player1Score: fixture.player1_score !== null ? String(fixture.player1_score) : '',
      player2Score: fixture.player2_score !== null ? String(fixture.player2_score) : '',
      adminNote: fixture.admin_note ?? '',
    };
    return drafts;
  }, {});
}

function getDisputeDrafts(disputes: OnlineTournamentDispute[]) {
  return disputes.reduce<Record<string, DisputeDraft>>((drafts, dispute) => {
    drafts[dispute.id] = {
      resolutionNote: dispute.resolution_note ?? '',
    };
    return drafts;
  }, {});
}

function getDefaultPayoutDraft(
  placement: number,
  payout: OnlineTournamentPayout | undefined
): PayoutDraft {
  const preset = EFOOTBALL_PAYOUT_PRESETS[placement - 1] ?? EFOOTBALL_PAYOUT_PRESETS[0];
  return {
    registrationId: payout?.registration_id ?? '',
    prizeLabel: payout?.prize_label ?? preset.prizeLabel,
    prizeValueKes:
      payout?.prize_value_kes !== null && payout?.prize_value_kes !== undefined
        ? String(payout.prize_value_kes)
        : preset.prizeValueKes,
    rewardType: payout?.reward_type ?? preset.rewardType,
    eligibilityStatus: payout?.eligibility_status ?? 'pending',
    payoutStatus: payout?.payout_status ?? 'pending',
    payoutRef: payout?.payout_ref ?? '',
    adminNote: payout?.admin_note ?? '',
  };
}

function getPayoutDrafts(payouts: OnlineTournamentPayout[]) {
  return [1, 2, 3].reduce<Record<string, PayoutDraft>>((drafts, placement) => {
    drafts[String(placement)] = getDefaultPayoutDraft(
      placement,
      payouts.find((item) => item.placement === placement)
    );
    return drafts;
  }, {});
}

function sortModeratorFixtures(fixtures: OnlineTournamentFixture[]) {
  return [...fixtures].sort((left, right) => {
    const roundDiff = FIXTURE_ROUND_ORDER[left.round] - FIXTURE_ROUND_ORDER[right.round];
    if (roundDiff !== 0) {
      return roundDiff;
    }

    return left.slot - right.slot;
  });
}

export function ModeratorTournamentControlClient() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const assignedTournament =
    getModeratorTournamentFromGameIds(user?.game_ids) ??
    getModeratorTournamentByKey(DEFAULT_MODERATOR_TOURNAMENT_KEY);
  const activeGame =
    user?.role === 'admin'
      ? getGameFromSearch(searchParams.get('game'), assignedTournament.game)
      : assignedTournament.game;
  const activeConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[activeGame];
  const [state, setState] = useState<OnlineTournamentOpsDashboardState | null>(null);
  const [fixtureDrafts, setFixtureDrafts] = useState<Record<string, FixtureDraft>>({});
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({});
  const [disputeDrafts, setDisputeDrafts] = useState<Record<string, DisputeDraft>>({});
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, PayoutDraft>>({});
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || activeGame !== 'efootball') {
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      setLoading(true);
      try {
        const res = await authFetch(OPS_API_PATH);
        const data = (await res.json()) as TournamentOpsResponse;

        if (!res.ok) {
          if (!cancelled) {
            toast.error(data.error ?? `Could not load ${activeConfig.shortLabel} control desk`);
            setState(null);
          }
          return;
        }

        if (cancelled) {
          return;
        }

        setState(data);
        setFixtureDrafts(getFixtureDrafts(data.fixtures));
        setSubmissionNotes(
          data.submissions.reduce<Record<string, string>>((notes, submission) => {
            notes[submission.id] = submission.admin_note ?? '';
            return notes;
          }, {})
        );
        setDisputeDrafts(getDisputeDrafts(data.disputes));
        setPayoutDrafts(getPayoutDrafts(data.payouts));
      } catch {
        if (!cancelled) {
          toast.error(`Network error while loading ${activeConfig.shortLabel} control desk`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [activeConfig.shortLabel, activeGame, authFetch, authLoading]);

  if (activeGame !== 'efootball') {
    return <OnlineTournamentArenaClient surface="moderator" view="tournament" />;
  }

  const registrations = state?.registrations ?? [];
  const fixtures = sortModeratorFixtures(state?.fixtures ?? []);
  const submissions = (state?.submissions ?? []).filter(
    (submission) => submission.game === 'efootball'
  );
  const pendingSubmissions = submissions.filter((submission) => submission.status === 'pending');
  const disputes = (state?.disputes ?? []).filter((dispute) => dispute.game === 'efootball');
  const openDisputes = disputes.filter((dispute) => dispute.status === 'open');
  const payouts = (state?.payouts ?? []).filter((payout) => payout.game === 'efootball');
  const checkedInRoster = registrations.filter(
    (registration) =>
      registration.check_in_status === 'checked_in' &&
      registration.eligibility_status !== 'disqualified'
  );
  const registrationsById = new Map(
    registrations.map((registration) => [registration.id, registration])
  );

  const refreshState = async () => {
    if (activeGame !== 'efootball') {
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(OPS_API_PATH);
      const data = (await res.json()) as TournamentOpsResponse;
      if (!res.ok) {
        toast.error(data.error ?? 'Could not refresh the control desk');
        return;
      }

      setState(data);
      setFixtureDrafts(getFixtureDrafts(data.fixtures));
      setSubmissionNotes(
        data.submissions.reduce<Record<string, string>>((notes, submission) => {
          notes[submission.id] = submission.admin_note ?? '';
          return notes;
        }, {})
      );
      setDisputeDrafts(getDisputeDrafts(data.disputes));
      setPayoutDrafts(getPayoutDrafts(data.payouts));
    } catch {
      toast.error('Network error while refreshing the control desk');
    } finally {
      setLoading(false);
    }
  };

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
      const data = (await res.json()) as TournamentOpsResponse;

      if (!res.ok) {
        toast.error(data.error ?? `Could not update ${activeConfig.shortLabel} control desk`);
        return;
      }

      setState(data);
      setFixtureDrafts(getFixtureDrafts(data.fixtures));
      setSubmissionNotes(
        data.submissions.reduce<Record<string, string>>((notes, submission) => {
          notes[submission.id] = submission.admin_note ?? '';
          return notes;
        }, {})
      );
      setDisputeDrafts(getDisputeDrafts(data.disputes));
      setPayoutDrafts(getPayoutDrafts(data.payouts));
      toast.success(successMessage);
      if (data.ocr_scan_error) {
        toast.error(data.ocr_scan_error);
      }
    } catch {
      toast.error(`Network error while updating ${activeConfig.shortLabel} control desk`);
    } finally {
      setActingOn(null);
    }
  };

  const handleSeed = () => {
    void patchOps(
      'seed-efootball',
      { action: 'seed_efootball' },
      'eFootball bracket seeded'
    );
  };

  const handleRecordFixtureResult = (fixture: OnlineTournamentFixture) => {
    const draft = fixtureDrafts[fixture.id];
    if (!draft?.player1Score.trim() || !draft.player2Score.trim()) {
      toast.error('Enter both scores first');
      return;
    }

    void patchOps(
      `fixture-${fixture.id}`,
      {
        action: 'record_fixture_result',
        fixture_id: fixture.id,
        player1_score: draft.player1Score,
        player2_score: draft.player2Score,
        admin_note: draft.adminNote,
      },
      'Fixture result recorded'
    );
  };

  const handleResetFixtureResult = (fixture: OnlineTournamentFixture) => {
    const draft = fixtureDrafts[fixture.id];
    void patchOps(
      `reset-${fixture.id}`,
      {
        action: 'reset_fixture_result',
        fixture_id: fixture.id,
        admin_note: draft?.adminNote ?? '',
      },
      'Fixture reset for fresh review'
    );
  };

  const handleReviewSubmission = (
    submission: OnlineTournamentResultSubmission,
    status: OnlineTournamentResultStatus
  ) => {
    void patchOps(
      `submission-${submission.id}-${status}`,
      {
        action: 'set_result_status',
        submission_id: submission.id,
        status,
        admin_note: submissionNotes[submission.id] ?? '',
      },
      `Submission marked ${status}`
    );
  };

  const handleUpdateDispute = (
    dispute: OnlineTournamentDispute,
    status: OnlineTournamentDisputeStatus
  ) => {
    void patchOps(
      `dispute-${dispute.id}-${status}`,
      {
        action: 'update_dispute_status',
        dispute_id: dispute.id,
        status,
        resolution_note: disputeDrafts[dispute.id]?.resolutionNote ?? '',
      },
      `Dispute marked ${status}`
    );
  };

  const handleSavePayout = (placement: number) => {
    const draft = payoutDrafts[String(placement)];
    if (!draft) {
      toast.error('Payout row is not ready yet');
      return;
    }

    void patchOps(
      `payout-${placement}`,
      {
        action: 'update_payout',
        game: 'efootball',
        placement,
        registration_id: draft.registrationId || null,
        prize_label: draft.prizeLabel,
        prize_value_kes: draft.prizeValueKes || null,
        reward_type: draft.rewardType,
        eligibility_status: draft.eligibilityStatus,
        payout_status: draft.payoutStatus,
        payout_ref: draft.payoutRef,
        admin_note: draft.adminNote,
      },
      `Prize row #${placement} saved`
    );
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 shimmer rounded-[var(--radius-card)]" />
        <div className="h-80 shimmer rounded-[var(--radius-card)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-title">eFootball tournament control</p>
            <h1 className="mt-2 text-[1.45rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.9rem]">
              {activeConfig.label} moderator bracket desk
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Seed the bracket after check-in closes, score fixtures, clear disputes, and mark
              prizes ready from this page.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refreshState()} className="btn-ghost">
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              type="button"
              disabled={actingOn === 'seed-efootball' || fixtures.length > 0}
              onClick={handleSeed}
              className="btn-primary"
            >
              {actingOn === 'seed-efootball' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Swords size={14} />
              )}
              Seed bracket
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Checked in', value: checkedInRoster.length, icon: ClipboardCheck },
            { label: 'Fixtures', value: fixtures.length, icon: Swords },
            { label: 'Pending review', value: pendingSubmissions.length, icon: ShieldAlert },
            { label: 'Open disputes', value: openDisputes.length, icon: AlertCircle },
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

        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Seed list</p>
              <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                Players who will fill the bracket
              </h2>
            </div>
            <span className="brand-chip px-2.5 py-1">
              {Math.min(16, checkedInRoster.length)}/16
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            The current seeding order follows checked-in, non-disqualified registrations from
            earliest registration to latest.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {checkedInRoster.slice(0, 16).map((registration, index) => (
              <div
                key={registration.id}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Seed {index + 1}
                </p>
                <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                  {getPlayerLabel(registration)}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {registration.user?.username || registration.whatsapp_number || 'Player account'}
                </p>
              </div>
            ))}
            {checkedInRoster.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                No checked-in eFootball players yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Bracket</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Fixture scoring and resets
              </h2>
            </div>
            <Swords size={18} className="text-[var(--text-soft)]" />
          </div>

          <div className="mt-4 space-y-3">
            {fixtures.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-8 text-sm text-[var(--text-secondary)]">
                Seed the bracket once the final player list is ready.
              </div>
            ) : (
              fixtures.map((fixture) => {
                const draft = fixtureDrafts[fixture.id] ?? {
                  player1Score: '',
                  player2Score: '',
                  adminNote: '',
                };
                const player1 = registrationsById.get(fixture.player1_registration_id ?? '');
                const player2 = registrationsById.get(fixture.player2_registration_id ?? '');
                const canScore =
                  fixture.status !== 'bye' &&
                  fixture.status !== 'completed' &&
                  Boolean(fixture.player1_registration_id && fixture.player2_registration_id);
                const actionKey = `fixture-${fixture.id}`;
                const resetKey = `reset-${fixture.id}`;

                return (
                  <div
                    key={fixture.id}
                    className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">
                          {fixture.round_label} #{fixture.slot + 1}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusPill status={fixture.status} />
                          {fixture.screenshot_url ? (
                            <a
                              href={fixture.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgba(50,224,196,0.2)] px-2.5 py-1 text-xs font-bold text-[var(--accent-secondary-text)]"
                            >
                              <ExternalLink size={12} />
                              Evidence
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!canScore || actingOn === actionKey}
                          onClick={() => handleRecordFixtureResult(fixture)}
                          className="btn-primary min-h-9 px-3 py-2 text-xs"
                        >
                          {actingOn === actionKey ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Save size={13} />
                          )}
                          Record result
                        </button>
                        <button
                          type="button"
                          disabled={fixture.status !== 'completed' || actingOn === resetKey}
                          onClick={() => handleResetFixtureResult(fixture)}
                          className="btn-ghost min-h-9 px-3 py-2 text-xs"
                        >
                          {actingOn === resetKey ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <RotateCcw size={13} />
                          )}
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Player 1
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                          {getPlayerLabel(player1)}
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={draft.player1Score}
                          onChange={(event) =>
                            setFixtureDrafts((current) => ({
                              ...current,
                              [fixture.id]: {
                                ...draft,
                                player1Score: event.target.value,
                              },
                            }))
                          }
                          className="input mt-3"
                          placeholder="Score"
                        />
                      </div>

                      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Player 2
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                          {getPlayerLabel(player2)}
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={draft.player2Score}
                          onChange={(event) =>
                            setFixtureDrafts((current) => ({
                              ...current,
                              [fixture.id]: {
                                ...draft,
                                player2Score: event.target.value,
                              },
                            }))
                          }
                          className="input mt-3"
                          placeholder="Score"
                        />
                      </div>
                    </div>

                    <textarea
                      value={draft.adminNote}
                      onChange={(event) =>
                        setFixtureDrafts((current) => ({
                          ...current,
                          [fixture.id]: {
                            ...draft,
                            adminNote: event.target.value,
                          },
                        }))
                      }
                      className="input mt-3 min-h-24 resize-y"
                      placeholder="Official ruling, walkover note, or reset reason"
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Submissions</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Result review queue
                </h2>
              </div>
              <span className="brand-chip px-2.5 py-1">{pendingSubmissions.length} pending</span>
            </div>

            <div className="mt-4 space-y-3">
              {(pendingSubmissions.length > 0 ? pendingSubmissions : submissions.slice(0, 8)).map(
                (submission) => {
                  const registration = registrationsById.get(submission.registration_id ?? '');
                  const fixture = fixtures.find((item) => item.id === submission.fixture_id);
                  return (
                    <div
                      key={submission.id}
                      className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-black text-[var(--text-primary)]">
                            {getPlayerLabel(registration)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                            {fixture ? `${fixture.round_label} #${fixture.slot + 1}` : 'Fixture pending'} |{' '}
                            {submission.player1_score ?? '-'} - {submission.player2_score ?? '-'} |{' '}
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
                                Open proof
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {RESULT_STATUSES.map((status) => {
                            const actionKey = `submission-${submission.id}-${status}`;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={actingOn === actionKey}
                                onClick={() => handleReviewSubmission(submission, status)}
                                className={
                                  status === 'verified'
                                    ? 'btn-primary min-h-9 px-3 py-2 text-xs'
                                    : 'btn-ghost min-h-9 px-3 py-2 text-xs'
                                }
                              >
                                {actingOn === actionKey ? (
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
                            );
                          })}
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
                <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                  No eFootball submissions yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Disputes</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Resolution desk
                </h2>
              </div>
              <AlertCircle size={18} className="text-[var(--text-soft)]" />
            </div>

            <div className="mt-4 space-y-3">
              {disputes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                  No eFootball disputes have been opened.
                </div>
              ) : (
                disputes.map((dispute) => {
                  const draft = disputeDrafts[dispute.id] ?? { resolutionNote: '' };
                  return (
                    <div
                      key={dispute.id}
                      className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-black text-[var(--text-primary)]">
                            {dispute.title || 'Tournament dispute'}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                            {formatStatus(dispute.category)} | {formatDateTime(dispute.created_at)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill status={dispute.status} />
                            {dispute.evidence_url ? (
                              <a
                                href={dispute.evidence_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgba(50,224,196,0.2)] px-2.5 py-1 text-xs font-bold text-[var(--accent-secondary-text)]"
                              >
                                <ExternalLink size={12} />
                                Evidence
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {DISPUTE_STATUSES.map((status) => {
                            const actionKey = `dispute-${dispute.id}-${status}`;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={actingOn === actionKey}
                                onClick={() => handleUpdateDispute(dispute, status)}
                                className={
                                  status === 'resolved'
                                    ? 'btn-primary min-h-9 px-3 py-2 text-xs'
                                    : 'btn-ghost min-h-9 px-3 py-2 text-xs'
                                }
                              >
                                {actingOn === actionKey ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : status === 'resolved' ? (
                                  <CheckCircle2 size={13} />
                                ) : status === 'dismissed' ? (
                                  <XCircle size={13} />
                                ) : (
                                  <RotateCcw size={13} />
                                )}
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {dispute.reason ? (
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                          {dispute.reason}
                        </p>
                      ) : null}

                      <textarea
                        value={draft.resolutionNote}
                        onChange={(event) =>
                          setDisputeDrafts((current) => ({
                            ...current,
                            [dispute.id]: {
                              resolutionNote: event.target.value,
                            },
                          }))
                        }
                        className="input mt-3 min-h-24 resize-y"
                        placeholder="Resolution note"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Rewards</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Prize readiness
                </h2>
              </div>
              <Medal size={18} className="text-[var(--text-soft)]" />
            </div>

            <div className="mt-4 space-y-3">
              {getGamePrizeLabels('efootball').map((_, index) => {
                const placement = index + 1;
                const payout = payouts.find((item) => item.placement === placement);
                const draft =
                  payoutDrafts[String(placement)] ?? getDefaultPayoutDraft(placement, payout);
                const actionKey = `payout-${placement}`;

                return (
                  <div
                    key={placement}
                    className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          #{placement} place
                        </p>
                        <div className="mt-2">
                          <StatusPill status={draft.payoutStatus} />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={actingOn === actionKey}
                        onClick={() => handleSavePayout(placement)}
                        className="btn-ghost min-h-9 px-3 py-2 text-xs"
                      >
                        {actingOn === actionKey ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        Save
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Winner
                        </span>
                        <select
                          value={draft.registrationId}
                          onChange={(event) =>
                            setPayoutDrafts((current) => ({
                              ...current,
                              [String(placement)]: {
                                ...draft,
                                registrationId: event.target.value,
                              },
                            }))
                          }
                          className="input mt-2"
                        >
                          <option value="">Select player</option>
                          {checkedInRoster.map((registration) => (
                            <option key={registration.id} value={registration.id}>
                              {getPlayerLabel(registration)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Reward type
                        </span>
                        <select
                          value={draft.rewardType}
                          onChange={(event) =>
                            setPayoutDrafts((current) => ({
                              ...current,
                              [String(placement)]: {
                                ...draft,
                                rewardType: event.target.value as PayoutDraft['rewardType'],
                              },
                            }))
                          }
                          className="input mt-2"
                        >
                          {['cash', 'uc', 'cp', 'coins'].map((rewardType) => (
                            <option key={rewardType} value={rewardType}>
                              {rewardType}
                            </option>
                          ))}
                        </select>
                      </label>

                      <input
                        value={draft.prizeLabel}
                        onChange={(event) =>
                          setPayoutDrafts((current) => ({
                            ...current,
                            [String(placement)]: {
                              ...draft,
                              prizeLabel: event.target.value,
                            },
                          }))
                        }
                        className="input"
                        placeholder="Prize label"
                      />

                      <input
                        value={draft.prizeValueKes}
                        onChange={(event) =>
                          setPayoutDrafts((current) => ({
                            ...current,
                            [String(placement)]: {
                              ...draft,
                              prizeValueKes: event.target.value,
                            },
                          }))
                        }
                        className="input"
                        placeholder="Prize value in KES"
                      />

                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Eligibility
                        </span>
                        <select
                          value={draft.eligibilityStatus}
                          onChange={(event) =>
                            setPayoutDrafts((current) => ({
                              ...current,
                              [String(placement)]: {
                                ...draft,
                                eligibilityStatus: event.target
                                  .value as PayoutDraft['eligibilityStatus'],
                              },
                            }))
                          }
                          className="input mt-2"
                        >
                          {PAYOUT_ELIGIBILITY_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Payout status
                        </span>
                        <select
                          value={draft.payoutStatus}
                          onChange={(event) =>
                            setPayoutDrafts((current) => ({
                              ...current,
                              [String(placement)]: {
                                ...draft,
                                payoutStatus: event.target.value as OnlineTournamentPayoutStatus,
                              },
                            }))
                          }
                          className="input mt-2"
                        >
                          {PAYOUT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <input
                      value={draft.payoutRef}
                      onChange={(event) =>
                        setPayoutDrafts((current) => ({
                          ...current,
                          [String(placement)]: {
                            ...draft,
                            payoutRef: event.target.value,
                          },
                        }))
                      }
                      className="input mt-3"
                      placeholder="Payout reference"
                    />

                    <textarea
                      value={draft.adminNote}
                      onChange={(event) =>
                        setPayoutDrafts((current) => ({
                          ...current,
                          [String(placement)]: {
                            ...draft,
                            adminNote: event.target.value,
                          },
                        }))
                      }
                      className="input mt-3 min-h-20 resize-y"
                      placeholder="Prize note"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-title">Player lane</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Open the player-style tournament view
            </h2>
          </div>
          <Trophy size={18} className="text-[var(--text-soft)]" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Use the bracket desk above for tournament control. Use the player view when you want to
          confirm what contestants see during check-in and match reporting.
        </p>
        <Link href="/moderators/check-in?game=efootball" className="btn-ghost mt-4">
          Open moderator check-in lane
        </Link>
      </section>
    </div>
  );
}
