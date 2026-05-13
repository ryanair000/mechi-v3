'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getLoginPath } from '@/lib/navigation';
import { normalizeTournamentDeviceSerialLast6 } from '@/lib/online-tournament';
import {
  WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_SUPPORT_URL,
  formatWeekendCupPaymentStatus,
  getWeekendCupPaymentTierLabel,
  isWeekendCupRegistrationOpen,
  isWeekendCupGame,
  type WeekendCupPlayerRegistration,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';

const API_PATH = '/api/events/playmechi-weekend-cup/state';

function fallbackSummary(): WeekendCupRegistrationSummary {
  return {
    games: WEEKEND_CUP_GAMES.reduce(
      (games, game) => {
        games[game.game] = {
          registered: 0,
          confirmed: 0,
          pendingPayment: 0,
          slots: game.slots,
          spotsLeft: game.slots,
          full: false,
          checkedIn: 0,
          checkInCap: game.checkInCap,
          checkInSpotsLeft: game.checkInCap,
          checkInFull: false,
        };
        return games;
      },
      {} as WeekendCupRegistrationSummary['games']
    ),
    registrations: [],
    payment: {
      earlyBirdPaidCount: 0,
      earlyBirdPaidLimit: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit,
      earlyBirdRemaining: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit,
    },
  };
}

function paymentStatusClasses(status: WeekendCupPlayerRegistration['payment_status']) {
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

export function WeekendCupDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<WeekendCupRegistrationSummary>(fallbackSummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const requestedGame = searchParams.get('game') ?? '';
  const [selectedGame, setSelectedGame] = useState(() =>
    isWeekendCupGame(requestedGame) ? requestedGame : 'pubgm'
  );
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [device, setDevice] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [deviceSerialLast6, setDeviceSerialLast6] = useState('');

  const selectedConfig = useMemo(
    () => WEEKEND_CUP_GAMES.find((game) => game.game === selectedGame) ?? WEEKEND_CUP_GAMES[0],
    [selectedGame]
  );
  const currentRegistration = summary.registrations.find((registration) => registration.game === selectedGame);
  const signInHref = getLoginPath(`${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(selectedGame)}`);
  const currentRegistrationPaid = currentRegistration?.payment_status === 'paid';
  const registrationOpen = WEEKEND_CUP_REGISTRATION_ENABLED && isWeekendCupRegistrationOpen();

  useEffect(() => {
    if (registrationOpen && !authLoading && !user) {
      router.replace(signInHref);
    }
  }, [authLoading, registrationOpen, router, signInHref, user]);

  useEffect(() => {
    if (isWeekendCupGame(requestedGame)) {
      setSelectedGame(requestedGame);
    }
  }, [requestedGame]);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load your Weekend Cup dashboard');
        return;
      }

      setSummary(data);
    } catch {
      toast.error('Could not load your Weekend Cup dashboard');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!registrationOpen || authLoading || !user) {
      return;
    }

    void loadState();
  }, [authLoading, loadState, registrationOpen, user]);

  useEffect(() => {
    setIgn(currentRegistration?.in_game_username ?? '');
    setUid(currentRegistration?.game_uid ?? '');
    setDevice(currentRegistration?.device_model ?? '');
    setWhatsappNumber(currentRegistration?.whatsapp_number ?? '');
    setDeviceSerialLast6(currentRegistration?.device_serial_last6 ?? '');
  }, [currentRegistration]);

  const handleCheckIn = async () => {
    if (!currentRegistration) {
      toast.error('Register for this game first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_in',
          game: selectedGame,
          in_game_username: ign,
          game_uid: uid,
          device_model: device,
          whatsapp_number: whatsappNumber,
          device_serial_last6: normalizeTournamentDeviceSerialLast6(deviceSerialLast6),
        }),
      });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not complete Weekend Cup check-in');
        return;
      }

      setSummary(data);
      toast.success('Checked in. Your player dashboard is live.');
    } catch {
      toast.error('Network error while checking in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!registrationOpen) {
    return (
      <main className="page-container space-y-6 py-8">
        <section className="card circuit-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-title">Weekend Cup dashboard</p>
              <h1 className="text-3xl font-black text-[var(--text-primary)]">
                Registration dashboard opens with signups.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                {WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={WEEKEND_CUP_PUBLIC_PATH} className="btn-outline">
                /weekendcup
              </Link>
              <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-primary">
                <MessageCircle size={14} />
                Payment question
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container space-y-6 py-8">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Weekend Cup dashboard</p>
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Your player board</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Track your registration, payment status, and check-in without guessing. If your
              payment is still pending, the board will tell you straight.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={WEEKEND_CUP_PUBLIC_PATH} className="btn-outline">
              /weekendcup
            </Link>
            <Link href={WEEKEND_CUP_REGISTRATION_PATH} className="btn-ghost">
              Edit registration
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap gap-3">
              {WEEKEND_CUP_GAMES.map((game) => {
                const registration = summary.registrations.find((row) => row.game === game.game);
                return (
                  <button
                    key={game.game}
                    type="button"
                    onClick={() => setSelectedGame(game.game)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      selectedGame === game.game
                        ? 'bg-[var(--accent-primary)] text-[#04111c]'
                        : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {game.shortLabel}
                    {registration ? ' • saved' : ''}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Selected entry
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                {selectedConfig.label}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {selectedConfig.dateLabel} • {selectedConfig.timeLabel}
              </p>

              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 size={14} className="animate-spin" />
                  Loading your dashboard...
                </div>
              ) : currentRegistration ? (
                <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${paymentStatusClasses(
                      currentRegistration.payment_status
                    )}`}
                  >
                    {formatWeekendCupPaymentStatus(currentRegistration.payment_status)}
                  </span>
                  <p>
                    {currentRegistration.payment_tier
                      ? getWeekendCupPaymentTierLabel(currentRegistration.payment_tier)
                      : 'Your final tier locks after payment review.'}
                  </p>
                  <p>
                    {currentRegistrationPaid
                      ? 'You are good to check in.'
                      : 'You are not confirmed yet. Payment has to clear first.'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">
                  No entry saved for this game yet.
                  <Link href={`${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(selectedGame)}`} className="btn-primary mt-4 w-full">
                    Register now
                  </Link>
                </div>
              )}
            </div>

            {summary.registrations.length ? (
              <div className="mt-4 space-y-2">
                {summary.registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-4 py-3"
                  >
                    <div>
                      <p className="font-black text-[var(--text-primary)]">
                        {WEEKEND_CUP_GAMES.find((game) => game.game === registration.game)?.label}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {registration.in_game_username}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${paymentStatusClasses(
                        registration.payment_status
                      )}`}
                    >
                      {formatWeekendCupPaymentStatus(registration.payment_status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <ShieldCheck size={16} />
              <p className="font-black">Payment status matters here</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Pending payment players stay visible, but they do not get treated like fully
              confirmed players for check-in. That is how Early Bird and slot counts stay fair.
            </p>
            <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-outline mt-4">
              <MessageCircle size={14} />
              Payment help
            </a>
          </section>
        </div>

        <section className="card p-5">
          <p className="section-title">Check-in</p>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">
            {currentRegistrationPaid ? 'Finish your check-in details.' : 'Check-in is locked right now.'}
          </h2>

          {!currentRegistration ? (
            <div className="mt-4 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              Pick a game and save your registration first.
            </div>
          ) : !currentRegistrationPaid ? (
            <div className="mt-4 rounded-[1rem] border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
              {WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE}
            </div>
          ) : currentRegistration.check_in_status === 'checked_in' ? (
            <div className="mt-4 rounded-[1rem] border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)] p-4">
              <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                <CheckCircle2 size={18} />
                <p className="font-black">You are checked in.</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Keep this dashboard and your WhatsApp open for match-day drops, room calls, or
                bracket movement.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">IGN / gamer tag</label>
                <input
                  type="text"
                  value={ign}
                  onChange={(event) => setIgn(event.target.value)}
                  className="input"
                  placeholder="Your exact match name"
                />
              </div>
              <div>
                <label className="label">Game UID / player ID</label>
                <input
                  type="text"
                  value={uid}
                  onChange={(event) => setUid(event.target.value)}
                  className="input"
                  placeholder="Paste the exact ID"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Device model</label>
                  <input
                    type="text"
                    value={device}
                    onChange={(event) => setDevice(event.target.value)}
                    className="input"
                    placeholder="Device you will play on"
                  />
                </div>
                <div>
                  <label className="label">WhatsApp number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(event) => setWhatsappNumber(event.target.value)}
                    className="input"
                    placeholder="2547..."
                  />
                </div>
              </div>
              <div>
                <label className="label">Device serial last 6 (if requested)</label>
                <input
                  type="text"
                  value={deviceSerialLast6}
                  onChange={(event) =>
                    setDeviceSerialLast6(normalizeTournamentDeviceSerialLast6(event.target.value))
                  }
                  className="input"
                  placeholder="Optional for now"
                />
              </div>
              <button type="button" onClick={() => void handleCheckIn()} disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Checking in
                  </>
                ) : (
                  'Complete check-in'
                )}
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
