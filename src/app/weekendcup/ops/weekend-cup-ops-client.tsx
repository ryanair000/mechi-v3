'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, Save, Search } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_GAMES,
  formatWeekendCupPaymentStatus,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';
import type { OnlineTournamentGameKey } from '@/lib/online-tournament';

type WeekendCupOpsRegistration = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  phone: string | null;
  email: string | null;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  reward_eligible: boolean;
  eligibility_status: 'pending' | 'verified' | 'ineligible' | 'disqualified';
  check_in_status: 'registered' | 'checked_in' | 'no_show';
  entry_fee_kes: number | null;
  payment_tier: 'early_bird' | 'regular' | 'late' | null;
  payment_status: 'pending_payment' | 'paid' | 'failed' | 'refunded' | 'manual_review';
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  payment_note: string | null;
  game_uid: string | null;
  whatsapp_number: string | null;
  device_model: string | null;
  device_serial_last6: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  tournament_lobby_number: number | null;
  tournament_lobby_slot: number | null;
  tournament_lobby_assigned_at: string | null;
  admin_note: string | null;
  user?: {
    id: string;
    username: string;
    phone?: string | null;
    email?: string | null;
    role?: 'user' | 'moderator' | 'admin' | null;
    is_banned?: boolean | null;
  } | null;
};

type WeekendCupOpsResponse = {
  registrations: WeekendCupOpsRegistration[];
  summary: WeekendCupRegistrationSummary;
  error?: string;
};

type PaymentDraft = {
  payment_status: WeekendCupOpsRegistration['payment_status'];
  payment_tier: '' | 'early_bird' | 'regular' | 'late';
  entry_fee_kes: string;
  payment_reference: string;
  payment_note: string;
  check_in_status: WeekendCupOpsRegistration['check_in_status'];
};

function paymentStatusClasses(status: WeekendCupOpsRegistration['payment_status']) {
  switch (status) {
    case 'paid':
      return 'bg-[rgba(50,224,196,0.16)] text-[var(--accent-secondary-text)]';
    case 'manual_review':
      return 'bg-amber-500/14 text-amber-300';
    case 'failed':
    case 'refunded':
      return 'bg-red-500/14 text-red-300';
    case 'pending_payment':
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

function checkInClasses(status: WeekendCupOpsRegistration['check_in_status']) {
  switch (status) {
    case 'checked_in':
      return 'bg-[rgba(50,224,196,0.16)] text-[var(--accent-secondary-text)]';
    case 'no_show':
      return 'bg-red-500/14 text-red-300';
    case 'registered':
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

function makeDraft(registration: WeekendCupOpsRegistration): PaymentDraft {
  return {
    payment_status: registration.payment_status,
    payment_tier: registration.payment_tier ?? '',
    entry_fee_kes:
      registration.entry_fee_kes !== null && registration.entry_fee_kes !== undefined
        ? String(registration.entry_fee_kes)
        : '',
    payment_reference: registration.payment_reference ?? '',
    payment_note: registration.payment_note ?? '',
    check_in_status: registration.check_in_status,
  };
}

type WeekendCupOpsClientProps = {
  apiPath: string;
  heading: string;
  subheading: string;
};

export function WeekendCupOpsClient(props: WeekendCupOpsClientProps) {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<WeekendCupOpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState<'all' | OnlineTournamentGameKey>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PaymentDraft>>({});

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(props.apiPath, { method: 'GET' });
      const data = (await res.json()) as WeekendCupOpsResponse;
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load Weekend Cup ops');
        return;
      }

      setState(data);
      setDrafts(
        (data.registrations ?? []).reduce<Record<string, PaymentDraft>>((next, registration) => {
          next[registration.id] = makeDraft(registration);
          return next;
        }, {})
      );
    } catch {
      toast.error('Could not load Weekend Cup ops');
    } finally {
      setLoading(false);
    }
  }, [authFetch, props.apiPath]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const filteredRegistrations = useMemo(() => {
    const registrations = state?.registrations ?? [];
    const query = search.trim().toLowerCase();

    return registrations.filter((registration) => {
      if (gameFilter !== 'all' && registration.game !== gameFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        registration.user?.username,
        registration.in_game_username,
        registration.whatsapp_number,
        registration.payment_reference,
        registration.payment_status,
        registration.payment_tier,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [gameFilter, search, state?.registrations]);

  const handleQuickPaid = async (registration: WeekendCupOpsRegistration) => {
    setActingId(registration.id);
    try {
      const res = await authFetch(props.apiPath, {
        method: 'PATCH',
        body: JSON.stringify({
          registration_id: registration.id,
          payment_status: 'paid',
        }),
      });
      const data = (await res.json()) as WeekendCupOpsResponse;
      if (!res.ok) {
        toast.error(data.error ?? 'Could not confirm payment');
        return;
      }

      toast.success('Payment confirmed.');
      setState(data);
      setDrafts(
        (data.registrations ?? []).reduce<Record<string, PaymentDraft>>((next, item) => {
          next[item.id] = makeDraft(item);
          return next;
        }, {})
      );
    } catch {
      toast.error('Network error while confirming payment');
    } finally {
      setActingId(null);
    }
  };

  const handleSaveDraft = async (registrationId: string) => {
    const draft = drafts[registrationId];
    if (!draft) return;

    setActingId(registrationId);
    try {
      const res = await authFetch(props.apiPath, {
        method: 'PATCH',
        body: JSON.stringify({
          registration_id: registrationId,
          payment_status: draft.payment_status,
          payment_tier: draft.payment_tier || null,
          entry_fee_kes: draft.entry_fee_kes || null,
          payment_reference: draft.payment_reference || null,
          payment_note: draft.payment_note || null,
          check_in_status: draft.check_in_status,
        }),
      });
      const data = (await res.json()) as WeekendCupOpsResponse;
      if (!res.ok) {
        toast.error(data.error ?? 'Could not update registration');
        return;
      }

      toast.success('Weekend Cup registration updated.');
      setState(data);
      setDrafts(
        (data.registrations ?? []).reduce<Record<string, PaymentDraft>>((next, item) => {
          next[item.id] = makeDraft(item);
          return next;
        }, {})
      );
      setEditingId(null);
    } catch {
      toast.error('Network error while updating registration');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="page-container space-y-5 py-8">
      <section className="card circuit-panel p-5 sm:p-6">
        <p className="section-title">{props.heading}</p>
        <h1 className="text-3xl font-black text-[var(--text-primary)]">Weekend Cup payment ops</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {props.subheading}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">Paid</p>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {state?.summary
              ? Object.values(state.summary.games).reduce((sum, row) => sum + row.confirmed, 0)
              : 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">Pending</p>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {state?.summary
              ? Object.values(state.summary.games).reduce((sum, row) => sum + row.pendingPayment, 0)
              : 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">Checked in</p>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {state?.summary
              ? Object.values(state.summary.games).reduce((sum, row) => sum + row.checkedIn, 0)
              : 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">Early Bird used</p>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {state?.summary?.payment.earlyBirdPaidCount ?? 0}/{WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit}
          </p>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Search player, ref, or status"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', ...WEEKEND_CUP_GAMES.map((game) => game.game)] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGameFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  gameFilter === value
                    ? 'bg-[var(--accent-primary)] text-[#04111c]'
                    : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                {value === 'all'
                  ? 'All'
                  : WEEKEND_CUP_GAMES.find((game) => game.game === value)?.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Loader2 size={14} className="animate-spin" />
              Loading registrations...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No Weekend Cup registrations match that filter.</p>
          ) : (
            filteredRegistrations.map((registration) => {
              const draft = drafts[registration.id] ?? makeDraft(registration);
              const gameLabel = WEEKEND_CUP_GAMES.find((game) => game.game === registration.game)?.label ?? registration.game;

              return (
                <div key={registration.id} className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-[var(--text-primary)]">
                          {registration.user?.username ?? registration.in_game_username}
                        </p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${paymentStatusClasses(registration.payment_status)}`}>
                          {formatWeekendCupPaymentStatus(registration.payment_status)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${checkInClasses(registration.check_in_status)}`}>
                          {registration.check_in_status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {gameLabel} • IGN: {registration.in_game_username}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        WhatsApp: {registration.whatsapp_number ?? 'Not added'} • Ref:{' '}
                        {registration.payment_reference ?? 'Not added'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleQuickPaid(registration)}
                        disabled={actingId === registration.id || registration.payment_status === 'paid'}
                        className="btn-primary"
                      >
                        {actingId === registration.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            Mark paid
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId((current) => (current === registration.id ? null : registration.id))}
                        className="btn-outline"
                      >
                        {editingId === registration.id ? 'Close edit' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  {editingId === registration.id ? (
                    <div className="mt-4 grid gap-4 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 md:grid-cols-2">
                      <div>
                        <label className="label">Payment status</label>
                        <select
                          value={draft.payment_status}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                payment_status: event.target.value as PaymentDraft['payment_status'],
                              },
                            }))
                          }
                          className="input"
                        >
                          {['pending_payment', 'paid', 'manual_review', 'failed', 'refunded'].map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Payment tier</label>
                        <select
                          value={draft.payment_tier}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                payment_tier: event.target.value as PaymentDraft['payment_tier'],
                              },
                            }))
                          }
                          className="input"
                        >
                          <option value="">Auto assign</option>
                          <option value="early_bird">Early Bird</option>
                          <option value="regular">Regular</option>
                          <option value="late">Late</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Amount paid (KES)</label>
                        <input
                          type="text"
                          value={draft.entry_fee_kes}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                entry_fee_kes: event.target.value,
                              },
                            }))
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Payment ref</label>
                        <input
                          type="text"
                          value={draft.payment_reference}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                payment_reference: event.target.value,
                              },
                            }))
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Check-in status</label>
                        <select
                          value={draft.check_in_status}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                check_in_status: event.target.value as PaymentDraft['check_in_status'],
                              },
                            }))
                          }
                          className="input"
                        >
                          <option value="registered">registered</option>
                          <option value="checked_in">checked_in</option>
                          <option value="no_show">no_show</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">Payment note</label>
                        <textarea
                          value={draft.payment_note}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [registration.id]: {
                                ...draft,
                                payment_note: event.target.value,
                              },
                            }))
                          }
                          className="input min-h-[110px] resize-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveDraft(registration.id)}
                          disabled={actingId === registration.id}
                          className="btn-primary"
                        >
                          {actingId === registration.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Saving
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Save update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
