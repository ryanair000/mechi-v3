'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Vote,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import FooterSection from '@/components/footer';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import { getGameImage } from '@/lib/config';
import { getLoginPath, withQuery } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import {
  WEEKEND_CUP_BALLOTS,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_MAX_VOTE_SELECTIONS,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_PROMO_IMAGE,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTERABLE_GAMES,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_STREAM_LABEL,
  WEEKEND_CUP_VOTING_DISABLED_MESSAGE,
  WEEKEND_CUP_VOTING_ENABLED,
  getWeekendCupGamePricingLine,
} from '@/lib/weekend-cup';

type WeekendCupBallotOption = {
  id: string;
  slug: string;
  label: string;
  platform: 'mobile' | 'console' | 'pc' | 'mixed';
  description: string;
  isOfficial: boolean;
  votes: number;
  userVoted: boolean;
  suggestionNote: string | null;
};

type WeekendCupBallot = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  themeLabel: string;
  status: 'open' | 'review' | 'locked';
  totalVotes: number;
  options: WeekendCupBallotOption[];
};

type WeekendCupSeriesResponse = {
  ballots: WeekendCupBallot[];
  error?: string;
};

const API_PATH = '/api/weekendcup/series';
const VISIBLE_BALLOT_SLUGS = new Set(['weekend-cup-2-pc']);
const FIXED_SEASON_ONE_GAME_SLUGS = new Set(['pubgm', 'codm', 'efootball']);

const DASHBOARD_FONT_STYLE: CSSProperties & Record<string, string> = {
  '--font-display': 'var(--font-montserrat), "Montserrat", "Segoe UI Semibold", sans-serif',
  '--font-body': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
  '--font-sans': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
};

const OPTION_IMAGE_BY_SLUG: Partial<Record<string, string | null>> = {
  bloodstrike: '/game-artwork/bloodstrike-header.jpg',
  'fc-mobile': '/game-artwork/fc26-header.webp',
  efootball: getGameImage('efootball'),
  'free-fire': getGameImage('freefire'),
  ludo: getGameImage('ludo'),
  pubgm: getGameImage('pubgm'),
  codm: getGameImage('codm'),
  tekken8: getGameImage('tekken8'),
  fc26: getGameImage('fc26'),
  nba2k26: getGameImage('nba2k26'),
  mk11: getGameImage('mk11'),
  fortnite: getGameImage('fortnite'),
  'ea-sports-fc-26': getGameImage('fc26'),
  'mortal-kombat': getGameImage('mk11'),
  'nba-2k26': getGameImage('nba2k26'),
  'rocket-league': getGameImage('rocketleague'),
};

const DASHBOARD_INNER_RADIUS_CLASS = 'rounded-[var(--radius-panel)]';
const DASHBOARD_CONTROL_RADIUS_CLASS = '!rounded-[var(--radius-control)]';

function isAuthFailure(status: number, error?: string | null) {
  if (status === 401 || status === 403) {
    return true;
  }

  return Boolean(error && error.toLowerCase().includes('unauthorized'));
}

function getFallbackBallots() {
  return WEEKEND_CUP_BALLOTS.filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)).map((ballot) => ({
    id: ballot.slug,
    slug: ballot.slug,
    title: ballot.title,
    subtitle: ballot.subtitle,
    dateLabel: ballot.dateLabel,
    themeLabel: ballot.themeLabel,
    status: ballot.status,
    totalVotes: 0,
    options: ballot.options
      .filter((option) => !FIXED_SEASON_ONE_GAME_SLUGS.has(option.slug))
      .map((option) => ({
        id: `${ballot.slug}:${option.slug}`,
        slug: option.slug,
        label: option.label,
        platform: option.platform,
        description: option.description,
        isOfficial: option.isOfficial,
        votes: 0,
        userVoted: false,
        suggestionNote: null,
      })),
  }));
}

function getOptionTone(option: WeekendCupBallotOption) {
  switch (option.slug) {
    case 'bloodstrike':
      return 'from-orange-300/28 via-rose-400/18 to-slate-950';
    case 'fc-mobile':
      return 'from-cyan-300/28 via-sky-400/18 to-slate-950';
    case 'pubgm':
      return 'from-emerald-400/30 via-teal-400/18 to-slate-950';
    case 'codm':
      return 'from-rose-400/30 via-orange-400/16 to-slate-950';
    case 'efootball':
    case 'ea-sports-fc-26':
    case 'fc26':
      return 'from-cyan-400/28 via-sky-400/16 to-slate-950';
    case 'free-fire':
      return 'from-amber-300/30 via-orange-400/16 to-slate-950';
    case 'fortnite':
      return 'from-fuchsia-400/26 via-violet-400/16 to-slate-950';
    case 'mortal-kombat':
    case 'mk11':
      return 'from-red-500/28 via-rose-500/16 to-slate-950';
    case 'nba-2k26':
    case 'nba2k26':
      return 'from-orange-400/28 via-red-400/16 to-slate-950';
    case 'tekken8':
      return 'from-sky-300/28 via-cyan-400/14 to-slate-950';
    case 'warzone':
      return 'from-lime-300/25 via-emerald-400/14 to-slate-950';
    default:
      return option.platform === 'console'
        ? 'from-violet-400/24 via-fuchsia-400/14 to-slate-950'
        : 'from-teal-400/24 via-cyan-400/14 to-slate-950';
  }
}

function getOptionImage(option: WeekendCupBallotOption) {
  return OPTION_IMAGE_BY_SLUG[option.slug] ?? null;
}

function getOptionImagePosition(option: WeekendCupBallotOption) {
  switch (option.slug) {
    case 'bloodstrike':
      return 'center top';
    case 'fc-mobile':
      return 'center top';
    case 'efootball':
      return 'center top';
    case 'pubgm':
      return 'center center';
    case 'codm':
      return 'center center';
    case 'free-fire':
      return 'center top';
    case 'fc26':
    case 'nba2k26':
    case 'mk11':
    case 'tekken8':
      return 'center top';
    case 'fortnite':
      return 'center center';
    default:
      return 'center center';
  }
}

function isSeasonOneMysteryBallot(ballotSlug: string) {
  return ballotSlug === 'weekend-cup-1-mobile';
}

function getBallotHeading(ballot: WeekendCupBallot) {
  return isSeasonOneMysteryBallot(ballot.slug)
    ? 'Free Fire is confirmed.'
    : 'Vote the Season 2 console and PC game.';
}

function getBallotDescription(ballot: WeekendCupBallot) {
  return isSeasonOneMysteryBallot(ballot.slug)
    ? 'Mobile Games Cup voting is closed. Free Fire is the confirmed Season 1 mystery game, and registration is open now.'
    : 'Season 2 is for console and PC players. Pick one headline game from Tekken 8, FC 26, NBA 2K26, Mortal Kombat 11, and Fortnite.';
}

function getBallotScopeLabel(ballot: WeekendCupBallot) {
  return isSeasonOneMysteryBallot(ballot.slug)
    ? 'Free Fire confirmed'
    : 'Season 2 console and PC voting only';
}

type WeekendCupOptionCardProps = {
  option: WeekendCupBallotOption;
  isVoting: boolean;
};

function WeekendCupOptionCard({
  option,
  isVoting,
}: WeekendCupOptionCardProps) {
  const imageSrc = getOptionImage(option);

  return (
    <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-[inherit]">
      <div className={`absolute inset-0 bg-gradient-to-br ${getOptionTone(option)}`} />
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`${option.label} game artwork`}
          fill
          sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 45vw"
          quality={94}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ objectPosition: getOptionImagePosition(option) }}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/24 to-black/10" />
      {option.votes > 0 ? (
        <div className="absolute inset-x-0 top-0 flex items-center justify-end p-2.5">
          <span className="rounded-[var(--radius-control)] border border-white/14 bg-black/32 px-2 py-1 text-[0.68rem] font-black uppercase text-white/88">
            {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      ) : null}

      <div className="relative z-10 space-y-2.5 p-3.5">
        <h4 className="text-[1.1rem] font-black leading-tight text-white sm:text-[1.32rem]">
          {option.label}
        </h4>
        <div className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-white px-3 py-1.5 text-[0.72rem] font-black uppercase text-[#07111e]">
          {isVoting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : option.userVoted ? (
            <CheckCircle2 size={14} />
          ) : (
            <Vote size={14} />
          )}
          {option.userVoted ? 'Picked' : 'Vote now'}
        </div>
      </div>
    </div>
  );
}

type WeekendCupSuggestionCardProps = {
  ballotSlug: string;
  draft: {
    label: string;
    description: string;
  };
  loading: boolean;
  onLabelChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
};

function WeekendCupSuggestionCard({
  ballotSlug,
  draft,
  loading,
  onLabelChange,
  onDescriptionChange,
  onSubmit,
}: WeekendCupSuggestionCardProps) {
  return (
    <div
      className={`group relative flex min-h-[250px] flex-col overflow-hidden border border-white/10 bg-[rgba(17,26,44,0.72)] text-left shadow-[var(--shadow-soft)] sm:min-h-[270px] ${DASHBOARD_INNER_RADIUS_CLASS}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(50,224,196,0.1),transparent_42%),linear-gradient(180deg,rgba(17,26,44,0.96),rgba(8,14,24,0.98))]" />
      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="space-y-2">
          <p className="section-title">Suggest a game</p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Missing your pick? Add it here and we can consider it for a future Weekend Cup vote.
          </p>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3">
          <input
            type="text"
            value={draft.label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="Game title"
            className="input"
            maxLength={80}
            aria-label={`Suggest a game title for ${ballotSlug}`}
          />
          <textarea
            value={draft.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Why it should be in"
            className="input min-h-[88px] resize-none py-3"
            maxLength={240}
            aria-label={`Suggest why the game should be in for ${ballotSlug}`}
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className={`btn-outline mt-4 min-h-10 justify-center px-4 text-[0.88rem] ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Adding
            </>
          ) : (
            <>
              Suggest
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function WeekendCupClient() {
  const router = useRouter();
  const { clearLocalAuth, user } = useAuth();
  const authFetch = useAuthFetch();
  const [ballots, setBallots] = useState<WeekendCupBallot[]>([]);
  const [actingOptionId, setActingOptionId] = useState<string | null>(null);
  const [clearingBallotSlug, setClearingBallotSlug] = useState<string | null>(null);
  const [submittingBallotSlug, setSubmittingBallotSlug] = useState<string | null>(null);
  const [suggestionDrafts, setSuggestionDrafts] = useState<
    Record<string, { label: string; description: string }>
  >({});

  const signInHref = getLoginPath(`${WEEKEND_CUP_PUBLIC_PATH}#vote`, 'signin_required');
  const sessionExpiredHref = getLoginPath(`${WEEKEND_CUP_PUBLIC_PATH}#vote`, 'session_expired');

  const visibleBallots = useMemo(() => {
    const source = ballots.length > 0 ? ballots : getFallbackBallots();
    return source
      .filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug))
      .map((ballot) => ({
        ...ballot,
        options: ballot.options.filter((option) => !FIXED_SEASON_ONE_GAME_SLUGS.has(option.slug)),
      }));
  }, [ballots]);

  const loadState = useCallback(async () => {
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as WeekendCupSeriesResponse;

      if (!res.ok) {
        setBallots([]);
        return;
      }

      setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));
    } catch {
      setBallots([]);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleAuthFailure = useCallback(() => {
    clearLocalAuth();
    window.location.href = sessionExpiredHref;
  }, [clearLocalAuth, sessionExpiredHref]);

  const ensureLiveSession = useCallback(async () => {
    if (!user) {
      window.location.href = signInHref;
      return false;
    }

    try {
      const res = await authFetch('/api/auth/me', { method: 'GET' });
      if (res.ok) {
        return true;
      }

      let errorMessage: string | null = null;
      try {
        const data = (await res.json()) as { error?: string };
        errorMessage = typeof data.error === 'string' ? data.error : null;
      } catch {
        errorMessage = null;
      }

      if (isAuthFailure(res.status, errorMessage)) {
        handleAuthFailure();
        return false;
      }

      toast.error(errorMessage ?? 'Could not verify your session right now. Try again in a moment.');
      return false;
    } catch {
      toast.error('Could not verify your session right now. Try again in a moment.');
      return false;
    }
  }, [authFetch, handleAuthFailure, signInHref, user]);

  const handleVote = useCallback(
    async (optionId: string, alreadySelected: boolean, selectedCount: number) => {
      if (!WEEKEND_CUP_VOTING_ENABLED) {
        toast.error(WEEKEND_CUP_VOTING_DISABLED_MESSAGE);
        return;
      }

      if (!(await ensureLiveSession())) {
        return;
      }

      if (!alreadySelected && selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
        toast.error('You can pick up to five Season 2 Weekend Cup games.');
        return;
      }

      const pickedOption =
        visibleBallots.flatMap((ballot) => ballot.options).find((option) => option.id === optionId) ??
        null;

      setActingOptionId(optionId);
      try {
        const res = await authFetch(API_PATH, {
          method: 'POST',
          body: JSON.stringify({
            action: 'vote',
            option_id: optionId,
          }),
        });
        const data = (await res.json()) as WeekendCupSeriesResponse;

        if (isAuthFailure(res.status, data.error)) {
          handleAuthFailure();
          return;
        }

        if (!res.ok) {
          toast.error(data.error ?? 'Could not save vote');
          return;
        }

        setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));

        if (alreadySelected) {
          toast.success('Season 2 Weekend Cup game removed from your picks.');
          return;
        }

        router.push(
          withQuery('/weekendcup/vote/complete', {
            game: pickedOption?.label ?? 'Mystery game',
          })
        );
      } catch {
        toast.error('Network error while saving vote');
      } finally {
        setActingOptionId(null);
      }
    },
    [authFetch, ensureLiveSession, handleAuthFailure, router, visibleBallots]
  );

  const handleClearVotes = useCallback(async (ballotSlug: string) => {
    if (!(await ensureLiveSession())) {
      return;
    }

    setClearingBallotSlug(ballotSlug);
    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear_votes',
          ballot_slug: ballotSlug,
        }),
      });
      const data = (await res.json()) as WeekendCupSeriesResponse;

      if (isAuthFailure(res.status, data.error)) {
        handleAuthFailure();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Could not clear your picks');
        return;
      }

      toast.success('Season 2 Weekend Cup picks cleared.');
      setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));
    } catch {
      toast.error('Network error while clearing your picks');
    } finally {
      setClearingBallotSlug(null);
    }
  }, [authFetch, ensureLiveSession, handleAuthFailure]);

  const handleSuggest = useCallback(
    async (ballotSlug: string) => {
      if (!WEEKEND_CUP_VOTING_ENABLED) {
        toast.error(WEEKEND_CUP_VOTING_DISABLED_MESSAGE);
        return;
      }

      if (!(await ensureLiveSession())) {
        return;
      }

      const draft = suggestionDrafts[ballotSlug] ?? { label: '', description: '' };
      if (!draft.label.trim()) {
        toast.error('Add the game title first.');
        return;
      }

      const ballot = visibleBallots.find((item) => item.slug === ballotSlug);
      const selectedCount = ballot?.options.filter((option) => option.userVoted).length ?? 0;
      if (selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
        toast.error('You can pick up to five Season 2 Weekend Cup games.');
        return;
      }

      setSubmittingBallotSlug(ballotSlug);
      try {
        const res = await authFetch(API_PATH, {
          method: 'POST',
          body: JSON.stringify({
            action: 'suggest_game',
            ballot_slug: ballotSlug,
            label: draft.label,
            description: draft.description,
          }),
        });
        const data = (await res.json()) as WeekendCupSeriesResponse;

        if (isAuthFailure(res.status, data.error)) {
          handleAuthFailure();
          return;
        }

        if (!res.ok) {
          toast.error(data.error ?? 'Could not add that game');
          return;
        }

        setSuggestionDrafts((current) => ({
          ...current,
          [ballotSlug]: { label: '', description: '' },
        }));
        setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));
        router.push(
          withQuery('/weekendcup/suggest/complete', {
            game: draft.label.trim(),
          })
        );
      } catch {
        toast.error('Network error while suggesting the game');
      } finally {
        setSubmittingBallotSlug(null);
      }
    },
    [authFetch, ensureLiveSession, handleAuthFailure, router, suggestionDrafts, visibleBallots]
  );

  return (
    <div
      className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
      style={DASHBOARD_FONT_STYLE}
    >
      <PlayMechiHomeHeader />

      <main className="page-container max-w-[940px] space-y-7 pb-10 pt-2 sm:pt-3">
        <section id="overview" className="space-y-4 px-1 sm:px-2">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(12,20,34,0.82)] shadow-[var(--shadow-soft)]">
            <div className="relative aspect-[16/9] w-full sm:aspect-[16/7] lg:aspect-[21/6]">
              <Image
                src={WEEKEND_CUP_PROMO_IMAGE}
                alt="PlayMechi Weekend Cup Season 1 promo artwork"
                fill
                priority
                sizes="(min-width: 1280px) 900px, (min-width: 768px) 86vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111e]/36 via-transparent to-transparent" />
            </div>
          </div>

          <div className="mx-auto flex max-w-[760px] flex-col items-center space-y-3 text-center">
            <p className="section-title">Weekend Cup preview</p>
            <h1 className="mx-auto font-[var(--font-display)] text-[clamp(1.9rem,5.4vw,3.55rem)] font-black leading-[0.94] tracking-[-0.03em] text-[var(--text-primary)]">
              <span className="block whitespace-nowrap">PlayMechi Weekend Cup</span>
              <span className="sr-only"> </span>
              <span className="block">Season 1</span>
            </h1>
            <p className="mx-auto max-w-3xl text-[0.92rem] leading-7 text-[var(--text-secondary)] sm:text-[1rem]">
              Season 1 runs on <strong>{WEEKEND_CUP_EVENT_DATES}</strong>. PUBG Mobile locks Friday,
              CODM runs Saturday, and Sunday closes with eFootball plus Free Fire. Mobile Games Cup
              voting is closed and Free Fire is confirmed.
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                WEEKEND_CUP_EVENT_DATES,
                WEEKEND_CUP_PRIZE_POOL_LABEL,
                WEEKEND_CUP_ENTRY_PRICING.entryFromLabel,
                WEEKEND_CUP_STREAM_LABEL,
              ].map((item) => (
                <span
                  key={item}
                  className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.78rem]`}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={WEEKEND_CUP_REGISTRATION_PATH}
                className={`btn-primary min-h-11 px-4 py-2 text-[0.9rem] ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
              >
                Register for Weekend Cup
              </Link>
              <Link
                href={WEEKEND_CUP_REGISTRATION_PATH}
                className={`btn-outline min-h-11 px-4 py-2 text-[0.9rem] ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
              >
                View tournament desk
              </Link>
            </div>

            <div className={`w-full border border-white/10 bg-[rgba(10,18,32,0.72)] p-4 text-left shadow-[0_18px_70px_rgba(0,0,0,0.18)] sm:p-5 ${DASHBOARD_INNER_RADIUS_CLASS}`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="section-title">Weekend Cup registration</p>
                  <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.65rem]">
                    Lock in your Season 1 game.
                  </h2>
                </div>
                <span className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.74rem]`}>
                  Pay. Slot secured.
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {WEEKEND_CUP_REGISTERABLE_GAMES.map((game) => (
                  <Link
                    key={game.game}
                    href={withQuery(WEEKEND_CUP_REGISTRATION_PATH, { game: game.game })}
                    className={`group flex min-h-[92px] items-center justify-between gap-3 border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 transition hover:border-[rgba(50,224,196,0.45)] hover:bg-[rgba(50,224,196,0.1)] ${DASHBOARD_INNER_RADIUS_CLASS}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[var(--text-primary)]">
                        {game.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                        {game.dateLabel} at {game.timeLabel}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-[var(--accent-secondary-text)]">
                        {getWeekendCupGamePricingLine(game.game)}
                      </span>
                    </span>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-[var(--accent-secondary-text)] transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </section>

        <section id="vote" className="scroll-mt-24 space-y-5 px-1 pb-2 sm:px-2">
          {visibleBallots.map((ballot) => {
            const selectedCount = ballot.options.filter((option) => option.userVoted).length;

            return (
              <div key={ballot.slug} className="space-y-5">
                <div className="max-w-3xl space-y-3">
                  <p className="section-title">Player vote</p>
                  <h2 className="text-[clamp(1.7rem,3.4vw,2.7rem)] font-black leading-[0.98] text-[var(--text-primary)]">
                    {getBallotHeading(ballot)}
                  </h2>
                  <p className="max-w-2xl text-[0.9rem] leading-7 text-[var(--text-secondary)] sm:text-[0.98rem]">
                    {getBallotDescription(ballot)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.76rem]`}
                    >
                      {selectedCount === 0
                        ? 'No picks yet'
                        : `${selectedCount} ${selectedCount === 1 ? 'pick' : 'picks'} locked`}
                    </span>
                    {ballot.totalVotes > 0 ? (
                      <span
                        className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.76rem]`}
                      >
                        {ballot.totalVotes} {ballot.totalVotes === 1 ? 'vote' : 'votes'} cast
                      </span>
                    ) : null}
                    <span
                      className={`brand-chip ${DASHBOARD_CONTROL_RADIUS_CLASS} !px-3 !py-1 !text-[0.76rem]`}
                    >
                      {getBallotScopeLabel(ballot)}
                    </span>
                    {!user ? (
                      <Link
                        href={signInHref}
                        className={`btn-outline min-h-10 px-4 py-2 text-[0.86rem] ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
                      >
                        Sign in to vote
                      </Link>
                    ) : null}
                    {user && selectedCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleClearVotes(ballot.slug)}
                        disabled={clearingBallotSlug === ballot.slug}
                        className={`btn-ghost min-h-10 px-4 py-2 text-[0.86rem] ${DASHBOARD_CONTROL_RADIUS_CLASS}`}
                      >
                        {clearingBallotSlug === ballot.slug ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Clearing picks
                          </>
                        ) : (
                          <>
                            <RotateCcw size={14} />
                            Clear my picks
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  id="options"
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {ballot.options.flatMap((option, index) => {
                    const isVoting = actingOptionId === option.id;
                    const suggestionDraft = suggestionDrafts[ballot.slug] ?? { label: '', description: '' };
                    const suggestionCard =
                      isSeasonOneMysteryBallot(ballot.slug) && index === 0 ? (
                        <WeekendCupSuggestionCard
                          key={`suggest-${ballot.slug}`}
                          ballotSlug={ballot.slug}
                          draft={suggestionDraft}
                          loading={submittingBallotSlug === ballot.slug}
                          onLabelChange={(value) =>
                            setSuggestionDrafts((current) => ({
                              ...current,
                              [ballot.slug]: {
                                ...current[ballot.slug],
                                label: value,
                                description: current[ballot.slug]?.description ?? '',
                              },
                            }))
                          }
                          onDescriptionChange={(value) =>
                            setSuggestionDrafts((current) => ({
                              ...current,
                              [ballot.slug]: {
                                label: current[ballot.slug]?.label ?? '',
                                description: value,
                              },
                            }))
                          }
                          onSubmit={() => void handleSuggest(ballot.slug)}
                        />
                      ) : null;

                    return [
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          if (!isVoting) {
                            void handleVote(option.id, option.userVoted, selectedCount);
                          }
                        }}
                        aria-label={`${option.userVoted ? 'Remove vote for' : 'Vote for'} ${option.label}`}
                        aria-pressed={option.userVoted}
                        className={cn(
                          `group relative min-h-[250px] overflow-hidden border bg-[rgba(7,14,25,0.94)] text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 sm:min-h-[270px] ${DASHBOARD_INNER_RADIUS_CLASS}`,
                          option.userVoted
                            ? 'border-[rgba(50,224,196,0.34)] ring-1 ring-[rgba(50,224,196,0.2)]'
                            : 'border-white/10 hover:border-white/18'
                        )}
                      >
                        <WeekendCupOptionCard option={option} isVoting={isVoting} />
                      </button>,
                      suggestionCard,
                    ].filter(Boolean);
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <FooterSection className="!pt-6 md:!pt-12" />
    </div>
  );
}
