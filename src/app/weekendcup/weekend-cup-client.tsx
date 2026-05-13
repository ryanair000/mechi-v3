'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Vote,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { Stories, StoriesContent, Story } from '@/components/ui/stories-carousel';
import { getGameImage } from '@/lib/config';
import { getLoginPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import {
  WEEKEND_CUP_BALLOTS,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_MAX_VOTE_SELECTIONS,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_STREAM_LABEL,
  WEEKEND_CUP_TITLE,
  WEEKEND_CUP_VOTING_DISABLED_MESSAGE,
  WEEKEND_CUP_VOTING_ENABLED,
} from '@/lib/weekend-cup';

type WeekendCupBallotOption = {
  id: string;
  slug: string;
  label: string;
  platform: 'mobile' | 'console' | 'mixed';
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
const VISIBLE_BALLOT_SLUGS = new Set(['weekend-cup-1-mobile']);
const FIXED_SEASON_ONE_GAME_SLUGS = new Set(['pubgm', 'codm', 'efootball']);

const DASHBOARD_RADIUS_STYLE: CSSProperties & Record<string, string> = {
  '--radius': '0.5rem',
  '--radius-control': '0.55rem',
  '--radius-panel': '0.65rem',
  '--radius-card': '0.75rem',
  '--radius-hero': '0.8rem',
};

const OPTION_IMAGE_KEY_BY_SLUG = {
  efootball: 'efootball',
  'free-fire': 'freefire',
  ludo: 'ludo',
  pubgm: 'pubgm',
  codm: 'codm',
  fortnite: 'fortnite',
  'ea-sports-fc-26': 'fc26',
  'mortal-kombat': 'mk11',
  'nba-2k26': 'nba2k26',
  'rocket-league': 'rocketleague',
} as const;

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
    case 'pubgm':
      return 'from-emerald-400/30 via-teal-400/18 to-slate-950';
    case 'codm':
      return 'from-rose-400/30 via-orange-400/16 to-slate-950';
    case 'efootball':
    case 'ea-sports-fc-26':
      return 'from-cyan-400/28 via-sky-400/16 to-slate-950';
    case 'free-fire':
      return 'from-amber-300/30 via-orange-400/16 to-slate-950';
    case 'fortnite':
      return 'from-fuchsia-400/26 via-violet-400/16 to-slate-950';
    case 'mortal-kombat':
      return 'from-red-500/28 via-rose-500/16 to-slate-950';
    case 'nba-2k26':
      return 'from-orange-400/28 via-red-400/16 to-slate-950';
    case 'warzone':
      return 'from-lime-300/25 via-emerald-400/14 to-slate-950';
    default:
      return option.platform === 'console'
        ? 'from-violet-400/24 via-fuchsia-400/14 to-slate-950'
        : 'from-teal-400/24 via-cyan-400/14 to-slate-950';
  }
}

function getOptionImage(option: WeekendCupBallotOption) {
  const gameKey = OPTION_IMAGE_KEY_BY_SLUG[option.slug as keyof typeof OPTION_IMAGE_KEY_BY_SLUG];
  return gameKey ? getGameImage(gameKey) : null;
}

function getOptionImagePosition(option: WeekendCupBallotOption) {
  switch (option.slug) {
    case 'efootball':
      return 'center top';
    case 'pubgm':
      return 'center center';
    case 'codm':
      return 'center center';
    case 'free-fire':
      return 'center top';
    default:
      return 'center center';
  }
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
      <div className="absolute inset-x-0 top-0 flex items-center justify-end p-3">
        <span className="rounded-[var(--radius-control)] border border-white/14 bg-black/32 px-2.5 py-1 text-xs font-black uppercase text-white/88">
          {option.votes} votes
        </span>
      </div>

      <div className="relative z-10 space-y-3 p-4">
        <h4 className="text-[1.45rem] font-black leading-tight text-white sm:text-[1.7rem]">
          {option.label}
        </h4>
        <div className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-white px-3 py-2 text-xs font-black uppercase text-[#07111e]">
          {isVoting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : option.userVoted ? (
            <CheckCircle2 size={14} />
          ) : (
            <Vote size={14} />
          )}
          {option.userVoted ? 'Voted' : 'Vote'}
        </div>
      </div>
    </div>
  );
}

export function WeekendCupClient() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [ballots, setBallots] = useState<WeekendCupBallot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOptionId, setActingOptionId] = useState<string | null>(null);
  const [submittingBallotSlug, setSubmittingBallotSlug] = useState<string | null>(null);
  const [suggestionDrafts, setSuggestionDrafts] = useState<
    Record<string, { label: string; description: string }>
  >({});

  const signInHref = getLoginPath(`${WEEKEND_CUP_PUBLIC_PATH}#vote`);

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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleVote = async (optionId: string, alreadySelected: boolean, selectedCount: number) => {
    if (!WEEKEND_CUP_VOTING_ENABLED) {
      toast.error(WEEKEND_CUP_VOTING_DISABLED_MESSAGE);
      return;
    }

    if (!user) {
      router.push(signInHref);
      return;
    }

    if (!alreadySelected && selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
      toast.error(`Pick up to ${WEEKEND_CUP_MAX_VOTE_SELECTIONS} games for Weekend 1.`);
      return;
    }

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

      if (!res.ok) {
        toast.error(data.error ?? 'Could not save vote');
        return;
      }

      setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));
    } catch {
      toast.error('Network error while saving vote');
    } finally {
      setActingOptionId(null);
    }
  };

  const handleSuggest = async (ballotSlug: string) => {
    if (!WEEKEND_CUP_VOTING_ENABLED) {
      toast.error(WEEKEND_CUP_VOTING_DISABLED_MESSAGE);
      return;
    }

    if (!user) {
      router.push(signInHref);
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
      toast.error(`Remove one vote first. Max is ${WEEKEND_CUP_MAX_VOTE_SELECTIONS} games.`);
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

      if (!res.ok) {
        toast.error(data.error ?? 'Could not add that game');
        return;
      }

      toast.success('Game added to the ballot.');
      setSuggestionDrafts((current) => ({
        ...current,
        [ballotSlug]: { label: '', description: '' },
      }));
      setBallots((data.ballots ?? []).filter((ballot) => VISIBLE_BALLOT_SLUGS.has(ballot.slug)));
    } catch {
      toast.error('Network error while suggesting the game');
    } finally {
      setSubmittingBallotSlug(null);
    }
  };

  return (
    <div
      className="page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
      style={DASHBOARD_RADIUS_STYLE}
    >
      <WeekendCupHeader />

      <main className="page-container max-w-7xl space-y-8 pb-8 pt-7 sm:pt-9">
        <section id="overview" className="px-1 py-2 sm:px-2">
          <div className="max-w-4xl">
            <p className="section-title">Weekend Cup preview</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-[0.98] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              {WEEKEND_CUP_TITLE}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
              Season 1 lands on <strong>{WEEKEND_CUP_EVENT_DATES}</strong>. CODM, PUBG Mobile,
              and eFootball are locked in. Vote for the mystery-game slot, then register to
              lock your place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                WEEKEND_CUP_EVENT_DATES,
                WEEKEND_CUP_PRIZE_POOL_LABEL,
                WEEKEND_CUP_ENTRY_PRICING.entryFromLabel,
                WEEKEND_CUP_STREAM_LABEL,
              ].map((item) => (
                <span key={item} className="brand-chip">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={user ? '#vote' : signInHref} className="btn-primary">
                {user ? 'Vote Mystery Game' : 'Sign in to vote'}
              </Link>
              <Link href="/weekendcup" className="btn-outline">
                Register Now
              </Link>
            </div>
          </div>
        </section>

        <section id="vote" className="scroll-mt-24 px-1 py-6 sm:px-2">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="section-title">Player vote</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
                Vote the mystery game.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                The fixed games are already set. Pick up to {WEEKEND_CUP_MAX_VOTE_SELECTIONS} mystery-game
                choices, or suggest the title you want added to the vote.
              </p>
            </div>

            <div className="flex items-center gap-3 lg:justify-end">
              {!user ? (
                <Link href={signInHref} className="btn-outline">
                  Sign in to vote
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {visibleBallots.map((ballot) => {
              const selectedCount = ballot.options.filter((option) => option.userVoted).length;

              return (
              <div key={ballot.slug} className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {selectedCount}/{WEEKEND_CUP_MAX_VOTE_SELECTIONS} selected / {ballot.totalVotes} votes cast
                  </p>
                </div>

                <Stories id="options" className="scroll-mt-28">
                  <StoriesContent className="-ml-2 md:-ml-4">
                    {ballot.options.map((option) => {
                      const isVoting = actingOptionId === option.id;
                      return (
                        <Story
                          key={option.id}
                          onClick={() => {
                            if (!isVoting) {
                              void handleVote(option.id, option.userVoted, selectedCount);
                            }
                          }}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && !isVoting) {
                              event.preventDefault();
                              void handleVote(option.id, option.userVoted, selectedCount);
                            }
                          }}
                          aria-label={`${option.userVoted ? 'Remove vote for' : 'Vote for'} ${option.label}`}
                          aria-pressed={option.userVoted}
                          itemClassName="!w-[min(78vw,236px)] sm:!w-[224px] lg:!w-[236px]"
                          className={cn(
                            'group relative aspect-[3/4] min-h-[214px] overflow-hidden rounded-[var(--radius-panel)] border bg-[rgba(7,14,25,0.94)] text-left shadow-[var(--shadow-soft)] transition-all duration-200 sm:min-h-[242px]',
                            option.userVoted
                              ? 'border-[rgba(50,224,196,0.34)] ring-1 ring-[rgba(50,224,196,0.2)]'
                              : 'border-white/10 hover:-translate-y-0.5 hover:border-white/18'
                          )}
                        >
                          <WeekendCupOptionCard
                            option={option}
                            isVoting={isVoting}
                          />
                        </Story>
                      );
                    })}
                  </StoriesContent>
                </Stories>

                <div className="mt-5 border-t border-[var(--border-color)] pt-4">
                  <label className="label">Suggest a game</label>
                  <input
                    type="text"
                    value={suggestionDrafts[ballot.slug]?.label ?? ''}
                    onChange={(event) =>
                      setSuggestionDrafts((current) => ({
                        ...current,
                        [ballot.slug]: {
                          ...current[ballot.slug],
                          label: event.target.value,
                          description: current[ballot.slug]?.description ?? '',
                        },
                      }))
                    }
                    placeholder="Drop a title"
                    className="input"
                    maxLength={80}
                  />
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      value={suggestionDrafts[ballot.slug]?.description ?? ''}
                      onChange={(event) =>
                        setSuggestionDrafts((current) => ({
                          ...current,
                          [ballot.slug]: {
                            label: current[ballot.slug]?.label ?? '',
                            description: event.target.value,
                          },
                        }))
                      }
                      placeholder="Short reason"
                      className="input"
                      maxLength={240}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSuggest(ballot.slug)}
                      disabled={loading || submittingBallotSlug === ballot.slug}
                      className="btn-outline"
                    >
                      {submittingBallotSlug === ballot.slug ? (
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
              </div>
              );
            })}
          </div>
        </section>
      </main>

      <FooterSection className="!pt-6 md:!pt-12" />
    </div>
  );
}
