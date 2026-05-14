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
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_REGISTRATION_OPENS_LABEL,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  cleanWeekendCupText,
  formatWeekendCupPaymentStatus,
  getWeekendCupFallbackSummary,
  getWeekendCupGamePricingLine,
  getWeekendCupPaymentTierLabel,
  isWeekendCupGame,
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

const DASHBOARD_INNER_RADIUS_CLASS = 'rounded-[var(--radius-card)]';
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
  const { user, loading: authLoading } = useAuth();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [summary, setSummary] = useState<WeekendCupRegistrationSummary>(
    getWeekendCupFallbackSummary
  );
  const [submitting, setSubmitting] = useState(false);
  const requestedGame = searchParams.get('game') ?? '';
  const [selectedGame, setSelectedGame] = useState(() =>
    isWeekendCupGame(requestedGame) ? requestedGame : 'pubgm'
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
  const paymentReference = searchParams.get('reference') ?? '';
  const returnPath = withQuery(WEEKEND_CUP_REGISTRATION_PATH, {
    game: isWeekendCupGame(requestedGame) ? requestedGame : null,
    next: requestedNextPath || null,
  });
  const createAccountHref = getRegisterPath({ next: returnPath });
  const signInHref = getLoginPath(returnPath);
  const dashboardHref = requestedNextPath || `${WEEKEND_CUP_DASHBOARD_PATH}?game=${encodeURIComponent(selectedGame)}`;
  useEffect(() => {
    setRegistrationOpen(WEEKEND_CUP_REGISTRATION_ENABLED && isWeekendCupRegistrationOpen());
  }, []);

  useEffect(() => {
    if (isWeekendCupGame(requestedGame)) {
      setSelectedGame(requestedGame);
    }
  }, [requestedGame]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load Weekend Cup registration');
        return;
      }

      setSummary(data);
    } catch {
      toast.error('Could not load Weekend Cup registration');
    }
  }, [authFetch]);

  useEffect(() => {
    if (!registrationOpen || authLoading) {
      return;
    }

    void loadSummary();
  }, [authLoading, loadSummary, registrationOpen]);

  useEffect(() => {
    if (!registrationOpen || authLoading || !user || !paymentReference) {
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await authFetch(API_PATH, {
          method: 'POST',
          body: JSON.stringify({
            action: 'verify_payment',
            reference: paymentReference,
          }),
        });
        const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };

        if (!res.ok) {
          toast.error(data.error ?? 'Payment is not complete yet');
          return;
        }

        setSummary(data);
        toast.success('Payment confirmed. Your Weekend Cup slot is locked.');
        router.replace(withQuery(WEEKEND_CUP_REGISTRATION_PATH, {
          game: isWeekendCupGame(requestedGame) ? requestedGame : selectedGame,
        }));
      } catch {
        toast.error('Could not verify payment');
      }
    };

    void verifyPayment();
  }, [
    authFetch,
    authLoading,
    paymentReference,
    registrationOpen,
    requestedGame,
    router,
    selectedGame,
    user,
  ]);

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
          })
        | { error?: string };

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
        window.location.href = data.authorization_url;
        return;
      }

      toast.success('Payment already confirmed. Your slot is locked.');
      if (requestedNextPath) {
        router.push(requestedNextPath);
      }
    } catch {
      toast.error('Network error while saving registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (!registrationOpen) {
    return (
      <div
        className="app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
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
              {WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE} Vote first, shape the lineup,
              then return when the desk opens to lock your player entry.
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
                href={`${WEEKEND_CUP_PUBLIC_PATH}#vote`}
                className={`btn-primary ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
              >
                Vote first
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
        className="app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
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
              Registration is open. Use your Mechi account so your vote, player details,
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
      className="app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
      style={DASHBOARD_FONT_STYLE}
    >
      <HeaderSpacing />

      <main className="page-container max-w-[920px] pb-10 pt-[1.35rem]">
        <section className="space-y-5 px-1 py-6 sm:px-2 sm:py-8">
          <div>
            <p className="section-title">Weekend Cup registration</p>
            <h1 className="mt-2 max-w-3xl text-[clamp(2rem,3.6vw,3.4rem)] font-black leading-tight text-[var(--text-primary)]">
              Save your entry. Pay to lock the slot.
            </h1>
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-[var(--text-secondary)]">
              Choose your game, confirm your player details, then head to payment. If you played
              PlayMechi before, we pull in the latest details we already have.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                WEEKEND_CUP_ENTRY_PRICING.earlyBirdLimitLabel,
                WEEKEND_CUP_REGISTRATION_OPENS_LABEL,
              ].map((item) => (
                <span
                  key={item}
                  className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.78rem]`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Choose game
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Pick the title you are entering. Final comms still run through PlayMechi
                    before match day.
                  </p>
                </div>

                <div className="grid gap-2">
                  {WEEKEND_CUP_GAMES.map((game) => {
                    const selected = selectedGame === game.game;
                    return (
                      <button
                        key={game.game}
                        type="button"
                        onClick={() => setSelectedGame(game.game)}
                        className={`${DASHBOARD_INNER_RADIUS_CLASS} border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-[rgba(50,224,196,0.42)] bg-[rgba(50,224,196,0.13)]'
                            : 'border-white/10 bg-black/10 hover:border-white/20'
                        }`}
                      >
                        <span className="block font-black text-[var(--text-primary)]">{game.label}</span>
                        <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                          {game.dateLabel} / {getWeekendCupGamePricingLine(game.game)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className={`${DASHBOARD_INNER_RADIUS_CLASS} border border-white/10 bg-black/10 p-4`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Payment status
                  </p>
                  {currentRegistration ? (
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
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
                          : 'Tier locks when payment is confirmed.'}
                      </p>
                      <Link
                        href={dashboardHref}
                        className={`btn-outline mt-3 w-full justify-center ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
                      >
                        View status
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                      No saved entry yet. Every entry starts as pending until payment clears.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      {selectedConfig.label}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
                      Player details
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      20% full right now. {getWeekendCupGamePricingLine(selectedGame)}.
                    </p>
                  </div>
                  {currentRegistration ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(50,224,196,0.12)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                      <CheckCircle2 size={14} />
                      {currentRegistration.payment_status === 'paid' ? 'Confirmed' : 'Pending payment'}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">IGN / gamer tag</label>
                    <input
                      type="text"
                      value={inGameUsername}
                      onChange={(event) => setInGameUsername(event.target.value)}
                      placeholder="Your exact match-day name"
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

                <div className="grid gap-3 md:grid-cols-2">
                  <label className={`flex items-start gap-3 ${DASHBOARD_INNER_RADIUS_CLASS} border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-secondary)]`}>
                    <input
                      type="checkbox"
                      checked={followedInstagram}
                      onChange={(event) => setFollowedInstagram(event.target.checked)}
                      className="mt-1"
                    />
                    <span>I followed PlayMechi on Instagram.</span>
                  </label>

                  <label className={`flex items-start gap-3 ${DASHBOARD_INNER_RADIUS_CLASS} border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-secondary)]`}>
                    <input
                      type="checkbox"
                      checked={subscribedYoutube}
                      onChange={(event) => setSubscribedYoutube(event.target.checked)}
                      className="mt-1"
                    />
                    <span>I subscribed to PlayMechi on YouTube.</span>
                  </label>
                </div>

                <label className={`flex items-start gap-3 ${DASHBOARD_INNER_RADIUS_CLASS} border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-secondary)]`}>
                  <input
                    type="checkbox"
                    checked={availableAtMatchTime}
                    onChange={(event) => setAvailableAtMatchTime(event.target.checked)}
                    className="mt-1"
                  />
                  <span>I will be ready on {selectedConfig.dateLabel} at {selectedConfig.timeLabel}.</span>
                </label>

                <div className="flex flex-wrap gap-3">
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
                  <a href={WEEKEND_CUP_SUPPORT_URL} className={`btn-outline ${DASHBOARD_CONTROL_RADIUS_CLASS}`}>
                    <MessageCircle size={14} />
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
