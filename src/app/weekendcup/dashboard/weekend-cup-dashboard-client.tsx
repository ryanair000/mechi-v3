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
  WEEKEND_CUP_ACTIVE_PAYMENT_TIER,
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
const STATE_API_PATH = '/api/events/playmechi-weekend-cup/state';

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
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInIgn, setCheckInIgn] = useState('');
  const [checkInUid, setCheckInUid] = useState('');
  const [checkInDevice, setCheckInDevice] = useState('');
  const [checkInWhatsapp, setCheckInWhatsapp] = useState('');
  const [checkInSerial, setCheckInSerial] = useState('');
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofMatchNumber, setProofMatchNumber] = useState('1');
  const [proofKills, setProofKills] = useState('');
  const [proofPlacement, setProofPlacement] = useState('');
  const [proofPlayerScore, setProofPlayerScore] = useState('');
  const [proofOpponentScore, setProofOpponentScore] = useState('');
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
    formatKes(getWeekendCupPaymentTierAmount(WEEKEND_CUP_ACTIVE_PAYMENT_TIER, selectedConfig.game)) ?? 'KSh 75';
  const paymentLabel = currentRegistration?.payment_tier
    ? `${getWeekendCupPaymentTierLabel(currentRegistration.payment_tier)} ${formatKes(
        getWeekendCupPaymentTierAmount(currentRegistration.payment_tier, currentRegistration.game)
      ) ?? fallbackEntryAmount}`
    : `${getWeekendCupPaymentTierLabel(WEEKEND_CUP_ACTIVE_PAYMENT_TIER)} ${fallbackEntryAmount}`;
  const paymentAmountLabel = formatKes(currentRegistration?.entry_fee_kes) ?? fallbackEntryAmount;
  const checkInComplete = currentRegistration?.check_in_status === 'checked_in';

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
      const res = await authFetch(STATE_API_PATH, { method: 'GET' });
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

  useEffect(() => {
    setCheckInIgn(currentRegistration?.in_game_username ?? '');
    setCheckInUid(currentRegistration?.game_uid ?? '');
    setCheckInDevice(currentRegistration?.device_model ?? '');
    setCheckInWhatsapp(currentRegistration?.whatsapp_number ?? '');
    setCheckInSerial(currentRegistration?.device_serial_last6 ?? '');
  }, [
    currentRegistration?.device_model,
    currentRegistration?.device_serial_last6,
    currentRegistration?.game_uid,
    currentRegistration?.id,
    currentRegistration?.in_game_username,
    currentRegistration?.whatsapp_number,
  ]);

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

  const handleSubmitProof = useCallback(async () => {
    if (!currentRegistration) {
      toast.error('Save a Weekend Cup entry first.');
      return;
    }

    if (currentRegistration.payment_status !== 'paid') {
      toast.error('Payment must be confirmed before result proof.');
      return;
    }

    if (!proofFile) {
      toast.error('Choose a result screenshot first.');
      return;
    }

    const formData = new FormData();
    formData.append('game', currentRegistration.game);
    formData.append('screenshot', proofFile);

    if (currentRegistration.game === 'efootball') {
      formData.append('player1_score', proofPlayerScore);
      formData.append('player2_score', proofOpponentScore);
    } else {
      formData.append('match_number', proofMatchNumber);
      formData.append('kills', proofKills);
      formData.append('placement', proofPlacement);
    }

    setProofSubmitting(true);
    try {
      const res = await authFetch('/api/events/playmechi-weekend-cup/results', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { error?: string };

      if (res.status === 401 || res.status === 403) {
        if (data.error) {
          toast.error(data.error);
          return;
        }

        handleAuthExpired();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not submit proof');
        return;
      }

      toast.success('Result proof submitted. Moderators will review it.');
      setProofFile(null);
      setProofKills('');
      setProofPlacement('');
      setProofPlayerScore('');
      setProofOpponentScore('');
      await loadSummary();
    } catch {
      toast.error('Network error while uploading proof');
    } finally {
      setProofSubmitting(false);
    }
  }, [
    authFetch,
    currentRegistration,
    handleAuthExpired,
    loadSummary,
    proofFile,
    proofKills,
    proofMatchNumber,
    proofOpponentScore,
    proofPlacement,
    proofPlayerScore,
  ]);

  const handleCheckIn = useCallback(async () => {
    if (!currentRegistration) {
      toast.error('Save a Weekend Cup entry first.');
      return;
    }

    if (currentRegistration.payment_status !== 'paid') {
      toast.error('Payment must be confirmed before check-in.');
      return;
    }

    setCheckInSubmitting(true);
    try {
      const res = await authFetch(STATE_API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_in',
          game: currentRegistration.game,
          in_game_username: checkInIgn,
          game_uid: checkInUid,
          device_model: checkInDevice,
          whatsapp_number: checkInWhatsapp,
          device_serial_last6: checkInSerial,
        }),
      });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };

      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not complete Weekend Cup check-in');
        return;
      }

      setSummary(data);
      toast.success('Weekend Cup check-in complete.');
    } catch {
      toast.error('Network error while checking in');
    } finally {
      setCheckInSubmitting(false);
    }
  }, [
    authFetch,
    checkInDevice,
    checkInIgn,
    checkInSerial,
    checkInUid,
    checkInWhatsapp,
    currentRegistration,
    handleAuthExpired,
  ]);

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
  const availabilityLabel = 'Limited slots available';
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

      {currentRegistration ? (
        <section className="card p-5 sm:p-6">
          <p className="section-title">Match-day check-in</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            Confirm your player details
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Paid players must check in here before result proof is accepted. Use the same account
            and WhatsApp number moderators should recognize on match day.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={checkInIgn}
              onChange={(event) => setCheckInIgn(event.target.value)}
              placeholder="In-game name"
              className="input"
            />
            <input
              value={checkInUid}
              onChange={(event) => setCheckInUid(event.target.value)}
              placeholder="Game UID / player ID"
              className="input"
            />
            <input
              value={checkInDevice}
              onChange={(event) => setCheckInDevice(event.target.value)}
              placeholder="Device model"
              className="input"
            />
            <input
              value={checkInWhatsapp}
              onChange={(event) => setCheckInWhatsapp(event.target.value)}
              placeholder="WhatsApp number"
              inputMode="tel"
              className="input"
            />
            <input
              value={checkInSerial}
              onChange={(event) => setCheckInSerial(event.target.value)}
              placeholder="Device serial last 6 (if requested)"
              className="input md:col-span-2"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCheckIn()}
              disabled={checkInSubmitting || currentRegistration.payment_status !== 'paid'}
              className="btn-primary"
            >
              {checkInSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Checking in
                </>
              ) : checkInComplete ? (
                'Update check-in'
              ) : (
                'Check in'
              )}
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              {checkInComplete
                ? 'Check-in complete. You can update details if needed.'
                : slotBooked
                  ? 'Ready once your details are filled.'
                  : 'Payment must clear before check-in.'}
            </span>
          </div>
        </section>
      ) : null}

      {currentRegistration ? (
        <section className="card p-5 sm:p-6">
          <p className="section-title">Result proof</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            Submit Weekend Cup screenshots
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Upload clear screenshots after each match. Moderators review proof before standings
            and prizes are finalized.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {currentRegistration.game === 'efootball' ? (
              <>
                <input
                  value={proofPlayerScore}
                  onChange={(event) => setProofPlayerScore(event.target.value)}
                  placeholder="Your score"
                  inputMode="numeric"
                  className="input"
                />
                <input
                  value={proofOpponentScore}
                  onChange={(event) => setProofOpponentScore(event.target.value)}
                  placeholder="Opponent score"
                  inputMode="numeric"
                  className="input"
                />
              </>
            ) : (
              <>
                <select
                  value={proofMatchNumber}
                  onChange={(event) => setProofMatchNumber(event.target.value)}
                  className="input"
                >
                  <option value="1">Match 1</option>
                  <option value="2">Match 2</option>
                  <option value="3">Match 3</option>
                </select>
                <input
                  value={proofKills}
                  onChange={(event) => setProofKills(event.target.value)}
                  placeholder="Kills"
                  inputMode="numeric"
                  className="input"
                />
                <input
                  value={proofPlacement}
                  onChange={(event) => setProofPlacement(event.target.value)}
                  placeholder="Final placement"
                  inputMode="numeric"
                  className="input md:col-span-2"
                />
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
              className="input md:col-span-2"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmitProof()}
              disabled={proofSubmitting || !proofFile}
              className="btn-primary"
            >
              {proofSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading proof
                </>
              ) : (
                'Submit proof'
              )}
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              {currentRegistration.check_in_status === 'checked_in'
                ? 'Check-in complete.'
                : 'Check-in is required before upload is accepted.'}
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
