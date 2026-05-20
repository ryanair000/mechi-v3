'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { getLoginPath, getRegisterPath, getSafeNextPath, withQuery } from '@/lib/navigation';
import {
  WEEKEND_CUP_DASHBOARD_PATH,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTERABLE_GAMES,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  cleanWeekendCupText,
  formatWeekendCupPaymentStatus,
  getWeekendCupFallbackSummary,
  getWeekendCupGamePricingLine,
  isWeekendCupRegisterableGame,
  isWeekendCupRegistrationOpen,
  type WeekendCupPlayerRegistration,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';

const API_PATH = '/api/events/playmechi-weekend-cup/register';

const DASHBOARD_FONT_STYLE: CSSProperties & Record<string, string> = {
  '--font-display': 'var(--font-montserrat), "Montserrat", "Segoe UI Semibold", sans-serif',
  '--font-body': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
  '--font-sans': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
};

const DASHBOARD_CONTROL_RADIUS_CLASS = '!rounded-[var(--radius-control)]';

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

function HeaderSpacing() {
  return (
    <WeekendCupHeader
      voteHref={`${WEEKEND_CUP_PUBLIC_PATH}#vote`}
    />
  );
}

export function WeekendCupRegistrationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { clearLocalAuth, user, loading: authLoading } = useAuth();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [summary, setSummary] = useState<WeekendCupRegistrationSummary>(
    getWeekendCupFallbackSummary
  );
  const [submitting, setSubmitting] = useState(false);
  const requestedGame = searchParams.get('game') ?? '';
  const [selectedGame, setSelectedGame] = useState<WeekendCupPlayerRegistration['game']>(() =>
    isWeekendCupRegisterableGame(requestedGame) ? requestedGame : 'pubgm'
  );
  const [inGameUsername, setInGameUsername] = useState('');
  const [followedInstagram, setFollowedInstagram] = useState(true);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [subscribedYoutube, setSubscribedYoutube] = useState(true);
  const [youtubeName, setYoutubeName] = useState('');
  const [availableAtMatchTime, setAvailableAtMatchTime] = useState(true);

  const selectedConfig = WEEKEND_CUP_GAMES.find((game) => game.game === selectedGame) ?? WEEKEND_CUP_GAMES[0];
  const currentRegistration = summary.registrations.find((registration) => registration.game === selectedGame);
  const requestedNextPath = getSafeNextPath(searchParams.get('next'), '');
  const returnPath = withQuery(WEEKEND_CUP_REGISTRATION_PATH, {
    game: isWeekendCupRegisterableGame(requestedGame) ? requestedGame : null,
    next: requestedNextPath || null,
  });
  const createAccountHref = getRegisterPath({ next: returnPath });
  const signInHref = getLoginPath(returnPath);
  const sessionExpiredHref = getLoginPath(returnPath, 'session_expired');
  const dashboardHref = requestedNextPath || `${WEEKEND_CUP_DASHBOARD_PATH}?game=${encodeURIComponent(selectedGame)}`;
  const handleAuthExpired = useCallback(() => {
    clearLocalAuth();
    toast.error('Your session expired. Sign in again to continue registration.');
    router.replace(sessionExpiredHref);
  }, [clearLocalAuth, router, sessionExpiredHref]);

  useEffect(() => {
    setRegistrationOpen(WEEKEND_CUP_REGISTRATION_ENABLED && isWeekendCupRegistrationOpen());
  }, []);

  useEffect(() => {
    if (isWeekendCupRegisterableGame(requestedGame)) {
      setSelectedGame(requestedGame);
    }
  }, [requestedGame]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };
      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load Weekend Cup registration');
        return;
      }

      setSummary(data);
    } catch {
      toast.error('Could not load Weekend Cup registration');
    }
  }, [authFetch, handleAuthExpired]);

  useEffect(() => {
    if (!registrationOpen || authLoading || !user) {
      return;
    }

    void loadSummary();
  }, [authLoading, loadSummary, registrationOpen, user]);

  useEffect(() => {
    const prefill = summary.prefill?.[selectedGame] ?? null;

    if (currentRegistration) {
      setInGameUsername(currentRegistration.in_game_username);
      setFollowedInstagram(currentRegistration.followed_instagram);
      setInstagramUsername(currentRegistration.instagram_username ?? '');
      setSubscribedYoutube(currentRegistration.subscribed_youtube);
      setYoutubeName(currentRegistration.youtube_name ?? '');
      return;
    }

    setInGameUsername(
      cleanWeekendCupText(prefill?.in_game_username ?? user?.game_ids?.[`${selectedGame}_mobile`] ?? '', 80)
    );
    setFollowedInstagram(prefill?.followed_instagram ?? true);
    setInstagramUsername(cleanWeekendCupText(prefill?.instagram_username ?? '', 80));
    setSubscribedYoutube(prefill?.subscribed_youtube ?? true);
    setYoutubeName(cleanWeekendCupText(prefill?.youtube_name ?? '', 100));
    setAvailableAtMatchTime(prefill?.available_at_8pm ?? true);
  }, [currentRegistration, selectedGame, summary.prefill, user]);

  const handleSubmit = async () => {
    if (!registrationOpen) {
      toast.error(WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE);
      return;
    }

    if (!user) {
      toast.error('Sign in to register for Weekend Cup.');
      router.replace(signInHref);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          game: selectedGame,
          in_game_username: inGameUsername,
          followed_instagram: followedInstagram,
          instagram_username: instagramUsername,
          subscribed_youtube: subscribedYoutube,
          youtube_name: youtubeName,
          available_at_match_time: availableAtMatchTime,
        }),
      });
      const data = (await res.json()) as
        | (WeekendCupRegistrationSummary & {
            error?: string;
            registration?: WeekendCupPlayerRegistration;
            authorization_url?: string | null;
            paymentLabel?: string;
            paymentCopy?: {
              mpesaKenyanPhoneOnly?: string;
            };
          })
        | { error?: string };

      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not save Weekend Cup registration');
        return;
      }

      if ('games' in data && 'registrations' in data) {
        setSummary(data);
      } else {
        await loadSummary();
      }

      if ('authorization_url' in data && data.authorization_url) {
        toast.success(
          data.paymentLabel
            ? `Entry request saved. Finish ${data.paymentLabel} payment in Paystack to lock your slot.`
            : 'Entry request saved. Finish payment in Paystack to lock your slot.'
        );
        if (data.paymentCopy?.mpesaKenyanPhoneOnly) {
          toast(data.paymentCopy.mpesaKenyanPhoneOnly, { duration: 8000 });
        }
        window.location.href = data.authorization_url;
        return;
      }

      toast.success('Payment already confirmed. Your slot is locked.');
      router.push(dashboardHref);
    } catch {
      toast.error('Network error while saving registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (!registrationOpen) {
    return (
      <div
        className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
        style={DASHBOARD_FONT_STYLE}
      >
        <HeaderSpacing />

        <main className="page-container max-w-5xl pb-10 pt-[1.65rem]">
          <section className="px-1 py-8 sm:px-2 sm:py-10">
            <p className="section-title">Weekend Cup registration</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Registration is opening.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              {WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE} Free Fire is confirmed for the Mobile
              Games Cup. Return when the desk opens to lock your player entry.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                WEEKEND_CUP_EVENT_DATES,
                WEEKEND_CUP_ENTRY_PRICING.entryFromLabel,
                WEEKEND_CUP_ENTRY_PRICING.earlyBirdLimitLabel,
                'Payment confirms the slot',
              ].map((item) => (
                <span key={item} className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS}`}>
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={WEEKEND_CUP_PUBLIC_PATH}
                className={`btn-primary ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
              >
                View lineup
              </Link>
              <a href={WEEKEND_CUP_SUPPORT_URL} className={`btn-outline ${DASHBOARD_CONTROL_RADIUS_CLASS}`}>
                <MessageCircle size={14} />
                Payment question
              </a>
            </div>
          </section>
        </main>

        <FooterSection className="!pt-4 md:!pt-8" />
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div
        className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
        style={DASHBOARD_FONT_STYLE}
      >
        <HeaderSpacing />

        <main className="page-container max-w-5xl pb-10 pt-[1.65rem]">
          <section className="px-1 py-8 sm:px-2 sm:py-10">
            <p className="section-title">Weekend Cup registration</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Sign in to register.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Registration is open. Use your Mechi account so your player details,
              payment status, and check-in all stay tied to the same profile.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={createAccountHref} className={`btn-primary ${DASHBOARD_CONTROL_RADIUS_CLASS}`}>
                Create account
              </Link>
              <Link href={signInHref} className={`btn-outline ${DASHBOARD_CONTROL_RADIUS_CLASS}`}>
                Sign in
              </Link>
            </div>
          </section>
        </main>

        <FooterSection className="!pt-4 md:!pt-8" />
      </div>
    );
  }

  return (
    <div
      className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
      style={DASHBOARD_FONT_STYLE}
    >
      <HeaderSpacing />

      <main className="page-container max-w-4xl pb-10 pt-5">
        <section className="px-1 py-6 sm:px-2">
          <div className="mb-6">
            <p className="section-title">Weekend Cup registration</p>
            <h1 className="mt-2 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-black leading-tight text-[var(--text-primary)]">
              Pick game. Add details. Pay to book.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              One entry per game. Payment is the only thing that locks the slot.
              {' '}M-PESA needs a Kenyan Safaricom number; outside Kenya, use Paybill, Till, Airtel, card, or support.
            </p>
          </div>

          <div className="rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.72)] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Game
                  </p>
                  <span className="text-xs font-bold text-[var(--accent-secondary-text)]">
                    {WEEKEND_CUP_ENTRY_PRICING.entryFromLabel}
                  </span>
                </div>

                <div className="grid gap-2">
                  {WEEKEND_CUP_REGISTERABLE_GAMES.map((game) => {
                    const selected = selectedGame === game.game;
                    return (
                    <button
                        key={game.game}
                        type="button"
                        onClick={() => setSelectedGame(game.game)}
                        className={`rounded-[var(--radius-panel)] border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-[rgba(50,224,196,0.48)] bg-[rgba(50,224,196,0.12)]'
                            : 'border-white/10 bg-transparent hover:border-white/25'
                        }`}
                      >
                        <span className="block text-sm font-black text-[var(--text-primary)]">
                          {game.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          {game.dateLabel} · {getWeekendCupGamePricingLine(game.game)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[var(--radius-panel)] border border-white/10 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Status
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${paymentStatusClasses(
                        currentRegistration?.payment_status ?? 'pending_payment'
                      )}`}
                    >
                      {currentRegistration
                        ? formatWeekendCupPaymentStatus(currentRegistration.payment_status)
                        : 'Not started'}
                    </span>
                    {currentRegistration ? (
                      <Link href={dashboardHref} className="text-xs font-bold text-[var(--accent-secondary-text)]">
                        View
                      </Link>
                    ) : null}
                  </div>
                </div>
              </aside>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      {selectedConfig.label}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
                      Player details
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {selectedConfig.dateLabel} at {selectedConfig.timeLabel}
                    </p>
                  </div>
                  {currentRegistration?.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(50,224,196,0.12)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                      <CheckCircle2 size={14} />
                      Booked
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">IGN / gamer tag</label>
                    <input
                      type="text"
                      value={inGameUsername}
                      onChange={(event) => setInGameUsername(event.target.value)}
                      placeholder="Exact match-day name"
                      className="input"
                      maxLength={80}
                    />
                  </div>

                  <div>
                    <label className="label">Instagram username</label>
                    <input
                      type="text"
                      value={instagramUsername}
                      onChange={(event) => setInstagramUsername(event.target.value)}
                      placeholder="@yourhandle"
                      className="input"
                      maxLength={80}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">YouTube name or email</label>
                  <input
                    type="text"
                    value={youtubeName}
                    onChange={(event) => setYoutubeName(event.target.value)}
                    placeholder="Channel name or subscription email"
                    className="input"
                    maxLength={100}
                  />
                </div>

                <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  <label className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-white/10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={followedInstagram}
                      onChange={(event) => setFollowedInstagram(event.target.checked)}
                      className="mt-1"
                    />
                    <span>Followed PlayMechi on Instagram.</span>
                  </label>

                  <label className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-white/10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={subscribedYoutube}
                      onChange={(event) => setSubscribedYoutube(event.target.checked)}
                      className="mt-1"
                    />
                    <span>Subscribed to PlayMechi on YouTube.</span>
                  </label>

                  <label className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-white/10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={availableAtMatchTime}
                      onChange={(event) => setAvailableAtMatchTime(event.target.checked)}
                      className="mt-1"
                    />
                    <span>Ready on {selectedConfig.dateLabel} at {selectedConfig.timeLabel}.</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || authLoading}
                    className={`btn-primary ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {currentRegistration?.payment_status === 'paid' ? 'Saving' : 'Opening checkout'}
                      </>
                    ) : (
                      currentRegistration?.payment_status === 'paid' ? 'Update entry' : 'Pay now'
                    )}
                  </button>
                  <a href={WEEKEND_CUP_SUPPORT_URL} className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    Payment help
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection className="!pt-4 md:!pt-8" />
    </div>
  );
}
