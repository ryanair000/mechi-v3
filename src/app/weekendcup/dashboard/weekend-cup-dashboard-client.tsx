'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getLoginPath } from '@/lib/navigation';
import {
  WEEKEND_CUP_DASHBOARD_PATH,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTERABLE_GAMES,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  formatWeekendCupPaymentStatus,
  getWeekendCupFallbackSummary,
  getWeekendCupPaymentTierAmount,
  getWeekendCupPaymentTierLabel,
  getWeekendCupWindowState,
  isWeekendCupGame,
  isWeekendCupRegisterableGame,
  isWeekendCupRegistrationOpen,
  type WeekendCupPlayerRegistration,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';

const API_PATH = '/api/events/playmechi-weekend-cup/register';

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

function formatKes(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return `KSh ${value.toLocaleString('en-KE')}`;
}

function StatusMetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
      <div className="flex items-center gap-2 text-[var(--text-soft)]">
        <Icon size={15} />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function WeekendCupDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { clearLocalAuth, user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<WeekendCupRegistrationSummary>(
    getWeekendCupFallbackSummary
  );
  const [loading, setLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const requestedGame = searchParams.get('game') ?? '';
  const [selectedGame, setSelectedGame] = useState<WeekendCupPlayerRegistration['game']>(() =>
    isWeekendCupRegisterableGame(requestedGame) ? requestedGame : 'pubgm'
  );

  const registrationOpen = WEEKEND_CUP_REGISTRATION_ENABLED && isWeekendCupRegistrationOpen();
  const dashboardGames = useMemo(() => {
    const hasMysteryEntry = summary.registrations.some((registration) => registration.game === 'mystery');
    return hasMysteryEntry ? WEEKEND_CUP_GAMES : WEEKEND_CUP_REGISTERABLE_GAMES;
  }, [summary.registrations]);
  const selectedConfig = useMemo(
    () => dashboardGames.find((game) => game.game === selectedGame) ?? dashboardGames[0] ?? WEEKEND_CUP_REGISTERABLE_GAMES[0],
    [dashboardGames, selectedGame]
  );
  const currentRegistration =
    summary.registrations.find((registration) => registration.game === selectedConfig.game) ?? null;
  const currentCounts = summary.games[selectedConfig.game];
  const signInHref = getLoginPath(
    `${WEEKEND_CUP_DASHBOARD_PATH}?game=${encodeURIComponent(selectedConfig.game)}`,
    'signin_required'
  );
  const sessionExpiredHref = getLoginPath(
    `${WEEKEND_CUP_DASHBOARD_PATH}?game=${encodeURIComponent(selectedConfig.game)}`,
    'session_expired'
  );
  const handleAuthExpired = useCallback(() => {
    clearLocalAuth();
    toast.error('Your session expired. Sign in again to open your dashboard.');
    router.replace(sessionExpiredHref);
  }, [clearLocalAuth, router, sessionExpiredHref]);

  const slotBooked = currentRegistration?.payment_status === 'paid';
  const fallbackEntryAmount =
    formatKes(getWeekendCupPaymentTierAmount('early_bird', selectedConfig.game)) ?? 'KSh 50';
  const paymentLabel = currentRegistration?.payment_tier
    ? `${getWeekendCupPaymentTierLabel(currentRegistration.payment_tier)} ${formatKes(
        getWeekendCupPaymentTierAmount(currentRegistration.payment_tier, currentRegistration.game)
      ) ?? fallbackEntryAmount}`
    : `Early Bird ${fallbackEntryAmount}`;
  const paymentAmountLabel = formatKes(currentRegistration?.entry_fee_kes) ?? fallbackEntryAmount;

  useEffect(() => {
    if (isWeekendCupGame(requestedGame) && dashboardGames.some((game) => game.game === requestedGame)) {
      setSelectedGame(requestedGame);
      return;
    }

    if (!dashboardGames.some((game) => game.game === selectedGame)) {
      setSelectedGame(dashboardGames[0]?.game ?? 'pubgm');
    }
  }, [dashboardGames, requestedGame, selectedGame]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(signInHref);
    }
  }, [authLoading, router, signInHref, user]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };

      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load your Weekend Cup status');
        return;
      }

      setSummary(data);
    } catch {
      toast.error('Could not load your Weekend Cup status');
    } finally {
      setLoading(false);
    }
  }, [authFetch, handleAuthExpired]);

  useEffect(() => {
    if (!registrationOpen || authLoading || !user) {
      return;
    }

    void loadSummary();
  }, [authLoading, loadSummary, registrationOpen, user]);

  const handleRetryPayment = useCallback(async () => {
    if (!currentRegistration) {
      toast.error('Pick a saved entry first.');
      return;
    }

    setRetryingPayment(true);
    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          game: currentRegistration.game,
          in_game_username: currentRegistration.in_game_username,
          instagram_username: currentRegistration.instagram_username ?? '',
          youtube_name: currentRegistration.youtube_name ?? '',
          followed_instagram: currentRegistration.followed_instagram,
          subscribed_youtube: currentRegistration.subscribed_youtube,
          available_at_match_time: true,
        }),
      });

      const data = (await res.json()) as
        | (WeekendCupRegistrationSummary & {
            error?: string;
            authorization_url?: string | null;
            paymentLabel?: string;
          })
        | { error?: string };

      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not reopen payment');
        return;
      }

      if ('games' in data && 'registrations' in data) {
        setSummary(data);
      }

      if ('authorization_url' in data && data.authorization_url) {
        toast.success(
          data.paymentLabel
            ? `Saved. Finish ${data.paymentLabel} payment in Paystack to lock the slot.`
            : 'Saved. Finish payment in Paystack to lock the slot.'
        );
        window.location.href = data.authorization_url;
        return;
      }

      toast.success('Payment already confirmed. Your slot is booked.');
    } catch {
      toast.error('Could not reopen payment');
    } finally {
      setRetryingPayment(false);
    }
  }, [authFetch, currentRegistration, handleAuthExpired]);

  if (!registrationOpen) {
    return (
      <main className="dashboard-page-container space-y-4 py-6">
        <section className="card p-5 sm:p-6">
          <p className="section-title">Weekend Cup dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            Status opens with registration.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE}
          </p>
        </section>
      </main>
    );
  }

  const paymentStateLabel = currentRegistration
    ? formatWeekendCupPaymentStatus(currentRegistration.payment_status)
    : 'No entry saved';
  const slotStateLabel = !currentRegistration ? 'Not booked yet' : slotBooked ? 'Booked' : 'Pending payment';
  const slotStateCopy = !currentRegistration
    ? 'No paid booking yet for this game.'
    : slotBooked
      ? 'Payment went through. Your slot is booked.'
      : 'Payment is still pending. Your slot is not booked yet.';
  const nextWindowCopy = slotBooked
    ? `Match-day check-in unlocks on ${selectedConfig.dateLabel} at ${selectedConfig.timeLabel}.`
    : 'Retry payment here if you still need to lock this slot.';
  const referenceLabel = currentRegistration?.payment_reference?.trim() || 'No payment reference yet';
  const availabilityLabel = currentCounts?.confirmed
    ? `${Math.max(0, currentCounts.spotsLeft)} confirmed spots left`
    : `${selectedConfig.slots} spots in the pool`;
  const windowState = getWeekendCupWindowState(selectedConfig);
  const matchWindowLabel = !windowState.isRegistrationOpen
    ? 'Registration closed'
    : `${selectedConfig.dateLabel} | ${selectedConfig.timeLabel}`;

  return (
    <main className="dashboard-page-container space-y-4 py-6">
      <section className="card p-5 sm:p-6">
        <p className="section-title">Weekend Cup dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">Check your slot</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          Check if payment cleared and if your slot is booked. If it is still pending, retry
          payment here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={WEEKEND_CUP_PUBLIC_PATH} className="btn-outline">
            Back to preview
          </Link>
          <Link
            href={`${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(selectedConfig.game)}`}
            className="btn-ghost"
          >
            {currentRegistration ? 'Edit entry' : 'Register for Weekend Cup'}
          </Link>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {dashboardGames.map((game) => {
            const registration = summary.registrations.find((row) => row.game === game.game);
            const isActive = selectedConfig.game === game.game;

            return (
              <button
                key={game.game}
                type="button"
                onClick={() => setSelectedGame(game.game)}
                className={`rounded-[var(--radius-control)] px-4 py-2 text-sm font-black ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-[#04111c]'
                    : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                {game.shortLabel}
                {registration ? ' | saved' : ''}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 size={14} className="animate-spin" />
            Loading your Weekend Cup status...
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-title">{selectedConfig.label}</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  Payment and slot status
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {matchWindowLabel}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${paymentStatusClasses(
                  currentRegistration?.payment_status ?? 'pending_payment'
                )}`}
              >
                {paymentStateLabel}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatusMetaCard icon={CreditCard} label="Payment" value={paymentStateLabel} />
              <StatusMetaCard icon={CheckCircle2} label="Slot" value={slotStateLabel} />
              <StatusMetaCard icon={Clock3} label="Current fee" value={paymentAmountLabel} />
              <StatusMetaCard icon={MessageCircle} label="Payment ref" value={referenceLabel} />
            </div>

            <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
              <p className="text-sm font-black text-[var(--text-primary)]">{slotStateCopy}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {nextWindowCopy}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {availabilityLabel} | {paymentLabel}
              </p>
              <div className="mt-4 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">
                  What happens after I pay?
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Paystack redirects you back to Mechi, then this dashboard updates from pending
                  payment to paid once confirmation lands. Paid players keep the slot and return
                  here for match-day check-in.
                </p>
              </div>
              {currentRegistration?.payment_note ? (
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  {currentRegistration.payment_note}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              {!currentRegistration ? (
                <Link
                  href={`${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(selectedConfig.game)}`}
                  className="btn-primary"
                >
                  Start registration
                </Link>
              ) : slotBooked ? (
                <Link
                  href={`${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(selectedConfig.game)}`}
                  className="btn-ghost"
                >
                  Update entry
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRetryPayment()}
                  disabled={retryingPayment}
                  className="btn-primary"
                >
                  {retryingPayment ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Opening checkout
                    </>
                  ) : (
                    'Retry payment'
                  )}
                </button>
              )}

              <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-outline">
                <MessageCircle size={14} />
                Need help?
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
