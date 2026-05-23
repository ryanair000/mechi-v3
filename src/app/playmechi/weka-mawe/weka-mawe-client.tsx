'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Trophy,
  Users,
  Video,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import FooterSection from '@/components/footer';
import { TournamentFacts } from '@/components/TournamentFacts';
import { useAuthFetch } from '@/components/AuthProvider';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import {
  WEKA_MAWE_BRACKET_PATH,
  WEKA_MAWE_CHECK_IN_PATH,
  WEKA_MAWE_GAME_LABEL,
  WEKA_MAWE_PUBLIC_PATH,
  WEKA_MAWE_REGISTER_PATH,
  WEKA_MAWE_TITLE,
  formatEatDateTime,
  isWekaMaweCheckInOpen,
  isWekaMaweRegistrationOpen,
  type WekaMaweEdition,
  type WekaMawePaymentStatus,
  type WekaMaweSummary,
} from '@/lib/weka-mawe-shared';
import { getPlayMechiSupportLabel } from '@/lib/tournament-facts';
import { getCustomerWhatsAppSupportUrl } from '@/lib/social-links';

type Mode = 'landing' | 'register' | 'check-in' | 'bracket';
type Tone = 'default' | 'success' | 'warning' | 'danger';

const API_PATH = '/api/weka-mawe/current-edition';
const REGISTER_API_PATH = '/api/weka-mawe/register';
const CHECK_IN_API_PATH = '/api/weka-mawe/check-in';
const WEKA_MAWE_SUPPORT_URL = getCustomerWhatsAppSupportUrl(
  'Hi PlayMechi, I need Weka Mawe payment help.'
);

function initialSummary(): WekaMaweSummary {
  return {
    edition: null,
    registrations: [],
    checkIns: [],
    matches: [],
    totals: { registered: 0, paid: 0, pendingPayment: 0, checkedIn: 0, slotsLeft: 0 },
    userRegistration: null,
    userCheckIn: null,
  };
}

function paymentLabel(status: WekaMawePaymentStatus | null | undefined) {
  if (!status) return 'Not registered';
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'manual_review':
      return 'Manual review';
    case 'refunded':
      return 'Refunded';
    default:
      return 'Pending payment';
  }
}

function paymentTone(status: WekaMawePaymentStatus | null | undefined): Tone {
  if (status === 'paid') return 'success';
  if (status === 'failed' || status === 'refunded') return 'danger';
  if (status === 'manual_review' || status === 'pending_payment') return 'warning';
  return 'default';
}

function toneClass(tone: Tone) {
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (tone === 'warning') return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  if (tone === 'danger') return 'border-rose-400/30 bg-rose-400/10 text-rose-100';
  return 'border-[var(--border-color)] bg-[var(--surface-soft)] text-[var(--text-primary)]';
}

function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
      <Icon size={18} className="text-[var(--accent-secondary-text)]" />
      <p className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
        <span>{paid} confirmed</span>
        <span>{total} max</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[var(--accent-secondary-text)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function getTournamentDisplayStatus({
  loading,
  edition,
  registrationOpen,
  checkInOpen,
  slotsLeft,
}: {
  loading: boolean;
  edition: WekaMaweEdition | null;
  registrationOpen: boolean;
  checkInOpen: boolean;
  slotsLeft: number;
}) {
  if (loading) {
    return {
      label: 'Loading tournament',
      tone: 'default' as Tone,
      primaryHref: WEKA_MAWE_PUBLIC_PATH,
      primaryLabel: 'Loading tournament',
    };
  }

  if (!edition) {
    return {
      label: 'Schedule pending',
      tone: 'warning' as Tone,
      primaryHref: WEKA_MAWE_PUBLIC_PATH,
      primaryLabel: 'View updates',
    };
  }

  if (registrationOpen) {
    return slotsLeft > 0
      ? {
          label: 'Registration open',
          tone: 'success' as Tone,
          primaryHref: WEKA_MAWE_REGISTER_PATH,
          primaryLabel: 'Register for Weka Mawe',
        }
      : {
          label: 'Slots full',
          tone: 'warning' as Tone,
          primaryHref: WEKA_MAWE_BRACKET_PATH,
          primaryLabel: 'View bracket',
        };
  }

  if (checkInOpen) {
    return {
      label: 'Check-in open',
      tone: 'success' as Tone,
      primaryHref: WEKA_MAWE_CHECK_IN_PATH,
      primaryLabel: 'Check in',
    };
  }

  switch (edition.status) {
    case 'draft':
      return {
        label: 'Schedule pending',
        tone: 'warning' as Tone,
        primaryHref: WEKA_MAWE_PUBLIC_PATH,
        primaryLabel: 'View updates',
      };
    case 'locked':
      return {
        label: 'Bracket locked',
        tone: 'warning' as Tone,
        primaryHref: WEKA_MAWE_BRACKET_PATH,
        primaryLabel: 'View bracket',
      };
    case 'live':
      return {
        label: 'Live now',
        tone: 'success' as Tone,
        primaryHref: WEKA_MAWE_BRACKET_PATH,
        primaryLabel: 'View bracket',
      };
    case 'completed':
      return {
        label: 'Completed',
        tone: 'default' as Tone,
        primaryHref: WEKA_MAWE_BRACKET_PATH,
        primaryLabel: 'View results',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        tone: 'danger' as Tone,
        primaryHref: WEKA_MAWE_PUBLIC_PATH,
        primaryLabel: 'View updates',
      };
    default:
      return {
        label: 'Registration closed',
        tone: 'warning' as Tone,
        primaryHref: WEKA_MAWE_BRACKET_PATH,
        primaryLabel: 'View bracket',
      };
  }
}

export function WekaMaweClient({ mode }: { mode: Mode }) {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<WekaMaweSummary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<Tone>('default');
  const [ign, setIgn] = useState('');
  const [phone, setPhone] = useState('');
  const edition = summary.edition;
  const userRegistration = summary.userRegistration ?? null;
  const isRegistered = Boolean(userRegistration);
  const isPaid = userRegistration?.payment_status === 'paid';
  const registrationOpen = isWekaMaweRegistrationOpen(edition);
  const checkInOpen = isWekaMaweCheckInOpen(edition);
  const entryFee = edition?.registration_fee_kes ?? 100;
  const maxPlayers = edition?.max_players ?? 32;
  const deadlineFactValue = loading
    ? 'Loading deadline...'
    : formatEatDateTime(edition?.registration_closes_at) || 'Registration close TBA';
  const slotsFactValue = loading
    ? 'Loading slots...'
    : edition
      ? `${summary.totals.slotsLeft}/${maxPlayers} slots left`
      : 'Slots TBA';
  const checkInFactValue = loading
    ? 'Loading check-in...'
    : formatEatDateTime(edition?.check_in_opens_at) || 'Check-in TBA';
  const tournamentFacts = [
    { label: 'Game', value: WEKA_MAWE_GAME_LABEL },
    { label: 'Entry fee', value: `KSh ${entryFee}` },
    { label: 'Prize pool', value: 'Winner payout announced by PlayMechi ops per edition' },
    { label: 'Deadline', value: deadlineFactValue },
    { label: 'Slots', value: slotsFactValue },
    { label: 'Check-in time', value: checkInFactValue },
    {
      label: 'Match rules',
      value: '32-player eFootball bracket. Quarter-finals onward require recording.',
    },
    { label: 'Payout method', value: 'Paystack-confirmed entry; payout handled by PlayMechi ops' },
    { label: 'Support contact', value: getPlayMechiSupportLabel() },
  ];
  const displayStatus = getTournamentDisplayStatus({
    loading,
    edition,
    registrationOpen,
    checkInOpen,
    slotsLeft: summary.totals.slotsLeft,
  });
  const scheduleLabel = loading
    ? 'Loading schedule...'
    : formatEatDateTime(edition?.starts_at) || 'Schedule pending';
  const checkInLabel = loading
    ? 'Loading check-in...'
    : formatEatDateTime(edition?.check_in_opens_at) || 'Check-in TBA';
  const slotsLeftValue = loading ? '...' : edition ? summary.totals.slotsLeft : 'TBA';
  const paidPlayersValue = loading ? '...' : `${summary.totals.paid}/${maxPlayers}`;
  const pendingPaymentValue = loading ? '...' : summary.totals.pendingPayment;
  const checkedInValue = loading ? '...' : summary.totals.checkedIn;

  const load = async () => {
    setLoading(true);
    try {
      const endpoint =
        mode === 'register' ? REGISTER_API_PATH : mode === 'check-in' ? CHECK_IN_API_PATH : API_PATH;
      const response = await authFetch(endpoint);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not load Weka Mawe.');
      setSummary(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load Weka Mawe.');
      setMessageTone('danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference || mode !== 'register') return;

    void (async () => {
      setSubmitting(true);
      setMessage('Checking Paystack payment status...');
      setMessageTone('default');
      try {
        const response = await authFetch(REGISTER_API_PATH, {
          method: 'POST',
          body: JSON.stringify({ action: 'verify_payment', reference }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Payment is not confirmed yet.');
        setSummary(payload);
        setMessage('Paystack payment verified. Your Weka Mawe slot is locked.');
        setMessageTone('success');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Payment is not confirmed yet.');
        setMessageTone('warning');
      } finally {
        setSubmitting(false);
      }
    })();
  }, [authFetch, mode, searchParams]);

  const groupedMatches = useMemo(
    () =>
      summary.matches.reduce<Record<string, WekaMaweSummary['matches']>>((groups, match) => {
        groups[match.round_key] = groups[match.round_key] ?? [];
        groups[match.round_key].push(match);
        return groups;
      }, {}),
    [summary.matches]
  );

  const register = async () => {
    setSubmitting(true);
    setMessage('');
    setMessageTone('default');
    try {
      const response = await authFetch(REGISTER_API_PATH, {
        method: 'POST',
        body: JSON.stringify({ ign, phone, whatsappNumber: phone }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sign in first, then come back here to pay and lock your Weka Mawe slot.');
        }
        throw new Error(payload.error ?? 'Could not register.');
      }
      if (payload.authorizationUrl) {
        setMessage('Opening Paystack checkout. Do not close the payment tab until it redirects back.');
        setMessageTone('default');
        window.location.href = payload.authorizationUrl;
        return;
      }
      setMessage('Registration saved. Complete payment to lock your slot.');
      setMessageTone('warning');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not register.');
      setMessageTone('danger');
    } finally {
      setSubmitting(false);
    }
  };

  const checkIn = async () => {
    setSubmitting(true);
    setMessage('');
    setMessageTone('default');
    try {
      const response = await authFetch(CHECK_IN_API_PATH, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not check in.');
      setSummary(payload);
      setMessage('Checked in. You are bracket-ready.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not check in.');
      setMessageTone('danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <PlayMechiHomeHeader />
      <main className="landing-shell py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill tone={displayStatus.tone}>{displayStatus.label}</Pill>
              <Pill>{WEKA_MAWE_GAME_LABEL}</Pill>
              <Pill>KSh {entryFee}</Pill>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-[var(--text-primary)] md:text-6xl">
              {mode === 'register' ? 'Register for Weka Mawe' : WEKA_MAWE_TITLE}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
              {mode === 'register'
                ? 'Fill your eFootball name and WhatsApp number once, then complete Paystack checkout. A slot counts only after Paystack confirms payment.'
                : 'The weekly PlayMechi eFootball bracket. Register online, pay KSh 100, check in on match day, and play through a 32-player single-elimination event.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={displayStatus.primaryHref}
                className="btn-primary inline-flex items-center gap-2"
              >
                {displayStatus.primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <Link href={WEKA_MAWE_CHECK_IN_PATH} className="btn-outline">
                Check In
              </Link>
              <Link href={WEKA_MAWE_BRACKET_PATH} className="btn-ghost">
                Bracket
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center gap-3 text-[var(--accent-secondary-text)]">
              <Trophy size={20} />
              <p className="font-black uppercase tracking-[0.12em]">Current edition</p>
            </div>
            <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
              {edition?.title ?? (loading ? 'Loading Weka Mawe...' : 'No active edition')}
            </h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--text-secondary)]">
              <p className="flex items-center gap-2">
                <CalendarDays size={16} /> {scheduleLabel}
              </p>
              <p className="flex items-center gap-2">
                <Clock3 size={16} /> Check-in {checkInLabel}
              </p>
              <p className="flex items-center gap-2">
                <WalletCards size={16} /> KSh {entryFee} via Paystack
              </p>
              <p className="flex items-center gap-2">
                <Video size={16} /> Quarter-finals onward require recording
              </p>
            </div>
            {loading || !edition ? null : <ProgressBar paid={summary.totals.paid} total={maxPlayers} />}
          </div>
        </section>

        <TournamentFacts
          title="Weka Mawe tournament facts"
          facts={tournamentFacts}
          className="mt-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5"
        />

        <section className="mt-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">
            What happens after I pay?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Paystack redirects you back to Mechi. Once confirmation lands, your Weka Mawe entry
            changes to paid, your slot is locked, and you can return for check-in before the
            bracket starts.
          </p>
          <a href={WEKA_MAWE_SUPPORT_URL} className="btn-outline mt-4 inline-flex">
            Need help?
          </a>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Paid players" value={paidPlayersValue} />
          <StatCard icon={ShieldCheck} label="Slots left" value={slotsLeftValue} />
          <StatCard icon={WalletCards} label="Pending payment" value={pendingPaymentValue} />
          <StatCard icon={CheckCircle2} label="Checked in" value={checkedInValue} />
        </section>

        {message ? (
          <div className={`mt-6 flex flex-col gap-3 rounded-lg border p-4 text-sm font-semibold sm:flex-row sm:items-start sm:justify-between ${toneClass(messageTone)}`}>
            <div className="flex gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{message}</p>
            </div>
            <a href={WEKA_MAWE_SUPPORT_URL} className="shrink-0 font-black underline underline-offset-4">
              Need help?
            </a>
          </div>
        ) : null}

        {mode === 'register' ? (
          <section className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Your entry</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Use the exact eFootball name you will play with. Your WhatsApp number is used only for match-day coordination.
              </p>

              {isRegistered ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-[var(--border-color)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Registered gamer tag
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{userRegistration?.ign}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill tone={paymentTone(userRegistration?.payment_status)}>
                        {paymentLabel(userRegistration?.payment_status)}
                      </Pill>
                      {isPaid ? <Pill tone="success">Slot locked</Pill> : <Pill tone="warning">Slot not locked</Pill>}
                    </div>
                  </div>
                  {!isPaid && userRegistration?.payment_authorization_url ? (
                    <a href={userRegistration.payment_authorization_url} className="btn-primary inline-flex items-center gap-2">
                      Complete Paystack Payment
                      <ArrowRight size={16} />
                    </a>
                  ) : null}
                  {userRegistration?.payment_reference ? (
                    <p className="text-xs font-semibold text-[var(--text-soft)]">
                      Payment ref: {userRegistration.payment_reference}
                    </p>
                  ) : null}
                  <a href={WEKA_MAWE_SUPPORT_URL} className="btn-outline inline-flex w-fit">
                    Need help?
                  </a>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      eFootball name
                    </span>
                    <input
                      value={ign}
                      onChange={(event) => setIgn(event.target.value)}
                      placeholder="Example: gamer_mastaa19"
                      className="form-input"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      WhatsApp number
                    </span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Example: 2547..."
                      className="form-input"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={register}
                    disabled={submitting || loading || !registrationOpen}
                    className="btn-primary inline-flex w-fit items-center gap-2"
                  >
                    {submitting ? 'Opening checkout...' : `Pay KSh ${entryFee}`}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {[
                ['Sign in', 'Your payment and bracket slot must attach to one Mechi account.'],
                ['Fill entry', 'Add your eFootball name and WhatsApp contact.'],
                ['Paystack checkout', 'Payment confirmation locks the slot. A saved form alone does not count.'],
                ['Check in', 'Return on match day and check in before the deadline.'],
              ].map(([title, body], index) => (
                <div key={title} className="rounded-lg border border-[var(--border-color)] p-4">
                  <p className="text-sm font-black text-[var(--accent-secondary-text)]">0{index + 1}</p>
                  <p className="mt-2 font-black text-[var(--text-primary)]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === 'check-in' ? (
          <section className="mt-10 max-w-2xl rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Website Check-In</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Only paid players who check in before the deadline are bracket-ready.
            </p>
            <div className="mt-5 rounded-lg border border-[var(--border-color)] p-4">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                Registration: {paymentLabel(userRegistration?.payment_status)}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                Check-in: {summary.userCheckIn?.status ?? 'not checked in'}
              </p>
              {summary.userCheckIn ? (
                <p className="mt-4 flex items-center gap-2 font-black text-[var(--accent-secondary-text)]">
                  <CheckCircle2 size={18} /> You are checked in.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={checkIn}
                  disabled={submitting || loading || !checkInOpen}
                  className="btn-primary mt-4"
                >
                  {submitting ? 'Checking in...' : 'Check In Now'}
                </button>
              )}
            </div>
          </section>
        ) : null}

        {(mode === 'bracket' || mode === 'landing') && summary.matches.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Bracket</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              {Object.entries(groupedMatches).map(([round, matches]) => (
                <div key={round} className="rounded-lg border border-[var(--border-color)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    {round.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-3 space-y-2">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-md bg-white/[0.03] p-3 text-xs">
                        <p className="font-bold text-[var(--text-primary)]">
                          {match.player_one?.username ?? 'TBD'} vs {match.player_two?.username ?? 'TBD'}
                        </p>
                        <p className="mt-1 text-[var(--text-secondary)]">
                          {match.status}
                          {match.recording_expected ? ` - recording ${match.recording_status}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === 'landing' ? (
          <section className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              ['Register online', 'The event page stays here. The registration form lives on the register page.'],
              ['Pay KSh 100', 'Your slot is counted only after Paystack confirms the transaction.'],
              ['Check in', 'The website check-in window opens before the bracket starts.'],
              ['Play bracket', 'Admin publishes the bracket and tracks recorded late rounds.'],
            ].map(([step, body], index) => (
              <div key={step} className="rounded-lg border border-[var(--border-color)] p-4">
                <p className="text-sm font-black text-[var(--accent-secondary-text)]">0{index + 1}</p>
                <p className="mt-2 font-black text-[var(--text-primary)]">{step}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
              </div>
            ))}
          </section>
        ) : null}

        {mode === 'register' && !isRegistered ? (
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
            <LockKeyhole size={18} className="mt-0.5 shrink-0 text-[var(--accent-secondary-text)]" />
            <p>
              Already registered? Sign in with the same Mechi account. The page will show your current payment
              status and checkout link.
            </p>
          </div>
        ) : null}
      </main>
      <FooterSection className="!pt-6 md:!pt-10" />
    </div>
  );
}
