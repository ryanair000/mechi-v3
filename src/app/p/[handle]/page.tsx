import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
  CalendarDays,
  Gamepad2,
  MapPin,
  Medal,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { PassportSocialActions } from '@/components/PassportSocialActions';
import { GAMES } from '@/lib/config';
import { verifyToken } from '@/lib/auth';
import { PASSPORT_GAME_STATUS_LABELS } from '@/lib/passport-game-types';
import { getPassportData, getPassportPath, normalizePassportUsername } from '@/lib/passport';
import { buildPassportMetadata } from '@/lib/passport-metadata';
import { arePassportFriends, hasPassportBlockBetween } from '@/lib/passport-social';
import { getPassportHighlights } from '@/lib/passport-community';
import { getPassportShelves, getVisiblePassportProgression } from '@/lib/passport-progression';
import {
  PASSPORT_ARCHETYPE_LABELS,
  PASSPORT_STATUS_LABELS,
  type PassportField,
  type PublicPassportData,
} from '@/lib/passport-types';
import type { GameKey, PlatformKey } from '@/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ handle: string }>;
};

const getCachedPublicPassport = cache((username: string) => getPassportData(username));

function resolveHandle(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return '';
  }
  if (!decoded.startsWith('@')) return '';
  return normalizePassportUsername(decoded);
}

function isVisible(passport: PublicPassportData, field: PassportField): boolean {
  const friendView = passport.library.access === 'friend';
  return passport.access === 'public'
    && (passport.identity.default_visibility === 'public' || (friendView && passport.identity.default_visibility === 'friends'))
    && (passport.identity.field_visibility[field] === 'public' || (friendView && passport.identity.field_visibility[field] === 'friends'));
}

function primaryChallengeSetup(passport: PublicPassportData): {
  game: GameKey;
  platform: PlatformKey;
} | null {
  if (!isVisible(passport, 'games') || !isVisible(passport, 'platforms')) return null;

  for (const game of passport.identity.games) {
    const config = GAMES[game];
    if (!config || config.mode !== '1v1') continue;
    const platform = passport.identity.platforms.find((candidate) =>
      config.platforms.includes(candidate)
    );
    if (platform) return { game, platform };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const username = resolveHandle(handle);
  return buildPassportMetadata(username ? await getCachedPublicPassport(username) : null);
}

export default async function GamerPassportPage({ params }: Props) {
  const { handle } = await params;
  const username = resolveHandle(handle);
  if (!username) notFound();

  let passport = await getCachedPublicPassport(username);
  if (!passport) notFound();

  const token = (await cookies()).get('auth_token')?.value;
  const viewer = token ? verifyToken(token) : null;
  if (viewer && viewer.sub !== passport.identity.user_id) {
    if (await hasPassportBlockBetween(viewer.sub, passport.identity.user_id)) notFound();
    if (await arePassportFriends(viewer.sub, passport.identity.user_id)) {
      passport = await getPassportData(username, { friendView: true });
      if (!passport) notFound();
    }
  }

  const { identity, summary } = passport;
  const challengeSetup = primaryChallengeSetup(passport);
  const showCompetitive = Boolean(summary && isVisible(passport, 'competitive'));
  const showEvents = isVisible(passport, 'events');
  const showAchievements = isVisible(passport, 'achievements');
  const showTeams = isVisible(passport, 'teams');
  const showGames = isVisible(passport, 'games');
  const highlights = passport.access === 'public' ? await getPassportHighlights(identity.user_id, viewer?.sub ?? null) : [];
  const [progression, shelves] = passport.access === 'public' ? await Promise.all([
    getVisiblePassportProgression(identity.user_id, viewer?.sub ?? null, showAchievements),
    showGames ? getPassportShelves(identity.user_id, viewer?.sub ?? null) : Promise.resolve([]),
  ]) : [null, []];
  const frame = progression?.cosmetics.find((cosmetic) => cosmetic.type === 'avatar_frame');
  const theme = progression?.cosmetics.find((cosmetic) => cosmetic.type === 'theme');
  const visibleHighlightIds = new Set(highlights.map((highlight) => highlight.id));
  const visibleShowcase = progression?.showcase.filter((item) => item.source_type === 'highlight' ? visibleHighlightIds.has(item.source_id) : item.source_type === 'achievement_award' ? showAchievements : item.source_type === 'event_credential' ? showEvents : item.source_type === 'team_achievement' ? showTeams : item.source_type === 'game_entry' ? showGames : false) ?? [];

  return (
    <div className="page-base min-h-screen bg-[linear-gradient(180deg,#071018,#0a1420_42%,#0d1724)] text-white">
      <nav className="border-b border-white/[0.06] bg-black/10 px-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between">
          <Link href="/playmechi" aria-label="PlayMechi home">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm">Create yours</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0e1927] shadow-[0_32px_100px_rgba(0,0,0,0.34)]" style={theme ? { boxShadow: `0 32px 100px rgba(0,0,0,.34), 0 0 0 1px ${String(theme.style_tokens.accent ?? identity.card_accent)}22` } : undefined}>
          <div className="relative h-44 sm:h-64">
            {identity.cover_url ? (
              <Image
                src={identity.cover_url}
                alt=""
                fill
                sizes="(min-width: 1280px) 1152px, 100vw"
                className="object-cover"
                preload
              />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 18% 12%, ${identity.card_accent}44, transparent 38%), linear-gradient(135deg, #111e2f, #08111c 62%, ${identity.card_accent}22)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1927] via-transparent to-black/10" />
            <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white/75 backdrop-blur">
              <ShieldCheck size={13} style={{ color: identity.card_accent }} />
              Mechi V5 Passport
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.75rem] border-4 bg-[#162334] shadow-2xl sm:h-28 sm:w-28" style={{ borderColor: frame ? String(frame.style_tokens.ring ?? identity.card_accent) : '#0e1927' }}>
                  {identity.avatar_url ? (
                    <Image
                      src={identity.avatar_url}
                      alt={`${identity.display_name} avatar`}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-4xl font-black"
                      style={{ color: identity.card_accent, background: `${identity.card_accent}16` }}
                    >
                      {identity.username[0]?.toUpperCase() ?? 'M'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: identity.card_accent }}>
                      @{identity.username}
                    </p>
                    {isVisible(passport, 'current_status') && identity.current_status !== 'offline' ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-white/70">
                        {PASSPORT_STATUS_LABELS[identity.current_status]}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-2 truncate text-3xl font-black leading-none text-white sm:text-5xl">
                    {identity.display_name}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
                    {isVisible(passport, 'location') && identity.location_label ? (
                      <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{identity.location_label}</span>
                    ) : null}
                    {isVisible(passport, 'gamer_since') && identity.gamer_since ? (
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />Gamer since {identity.gamer_since}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <PassportSocialActions username={identity.username} targetId={identity.user_id} />
                {challengeSetup ? (
                  <ChallengePlayerButton
                    opponentId={identity.user_id}
                    opponentUsername={identity.username}
                    game={challengeSetup.game}
                    platform={challengeSetup.platform}
                    label={`Challenge on ${GAMES[challengeSetup.game].label}`}
                    className="btn-primary"
                  />
                ) : null}
                <Link href="/register" className="btn-outline">Build your Passport</Link>
              </div>
            </div>

            {passport.access === 'restricted' ? (
              <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 text-center">
                <ShieldCheck className="mx-auto h-7 w-7 text-white/40" />
                <h2 className="mt-3 text-lg font-black">This Gamer Passport is private</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/48">
                  @{identity.username} controls who can see their gaming history, events, and competitive record.
                </p>
              </div>
            ) : (
              <>
                {isVisible(passport, 'archetypes') && identity.archetypes.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {identity.archetypes.map((archetype) => (
                      <span key={archetype} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/72">
                        {PASSPORT_ARCHETYPE_LABELS[archetype]}
                      </span>
                    ))}
                  </div>
                ) : null}
                {isVisible(passport, 'bio') && identity.bio ? (
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">{identity.bio}</p>
                ) : null}
              </>
            )}
          </div>
        </section>

        {passport.access === 'public' ? (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {showGames && summary ? <StatCard icon={<Gamepad2 size={17} />} value={summary.games_count} label="Games on Mechi" /> : null}
              {showCompetitive && summary ? <StatCard icon={<Swords size={17} />} value={summary.total_matches} label="Competitive matches" /> : null}
              {showEvents && summary ? <StatCard icon={<CalendarDays size={17} />} value={summary.events_attended} label="Verified check-ins" /> : null}
              {showAchievements && summary ? <StatCard icon={<Medal size={17} />} value={summary.achievements_count + summary.badges_count} label="Achievements & badges" /> : null}
            </section>

            {progression && (progression.customization.show_level || progression.customization.show_dimensions) ? <section className="mt-5 card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-title">Gamer progression</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Six ways this player shows up</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-soft)]">Dimensions explain participation from traceable Passport inputs. They are not a universal skill ranking.</p></div>{progression.customization.show_level ? <div className="rounded-2xl bg-[var(--brand-teal)]/10 px-4 py-3 text-center"><p className="text-[10px] font-black uppercase tracking-wide text-[var(--brand-teal)]">Passport level</p><p className="text-3xl font-black text-[var(--text-primary)]">{progression.passport_level}</p></div> : null}</div>{progression.customization.show_dimensions ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{progression.dimensions.map((dimension) => <div key={dimension.key} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"><div className="flex items-center justify-between"><p className="font-black text-[var(--text-primary)]">{dimension.label}</p><p className="font-black text-[var(--brand-teal)]">{dimension.score}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/15"><div className="h-full rounded-full bg-[var(--brand-teal)]" style={{ width: `${dimension.score}%` }}/></div><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-soft)]">{dimension.level}</p></div>)}</div> : null}</section> : null}

            {visibleShowcase.length ? <section className="mt-5 card p-5 sm:p-6"><p className="section-title">Passport showcase</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Chosen pieces of gaming identity</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleShowcase.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"><div className="flex items-center justify-between"><span className="text-xs font-black text-[var(--brand-teal)]">SLOT {item.slot}</span><span className="text-[10px] uppercase text-[var(--text-soft)]">{item.source_type.replaceAll('_', ' ')}</span></div><h3 className="mt-3 font-black text-[var(--text-primary)]">{item.label}</h3><p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-soft)]"><ShieldCheck size={12}/>Source-backed item</p></article>)}</div></section> : null}

            {showAchievements && progression?.achievements.length ? <section className="mt-5 card p-5 sm:p-6"><p className="section-title">Achievement cabinet</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Collectibles with visible trust</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{progression.achievements.slice(0, 9).map((achievement) => <article key={`${achievement.key}:${achievement.issued_at}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wide text-[var(--brand-gold)]">{achievement.rarity}</span><span className="text-[10px] uppercase text-[var(--text-soft)]">{achievement.family}</span></div><h3 className="mt-2 font-black text-[var(--text-primary)]">{achievement.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{achievement.requirement}</p><p className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--brand-teal)]"><ShieldCheck size={12}/>{achievement.trust_tier.replaceAll('_', ' ')} · {achievement.issuer}</p></article>)}</div></section> : null}

            {shelves.length ? <section className="mt-5 card p-5 sm:p-6"><p className="section-title">Game shelves</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Personal collections</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shelves.map((shelf) => <article key={String(shelf.id)} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"><h3 className="font-black text-[var(--text-primary)]">{String(shelf.title)}</h3>{shelf.description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{String(shelf.description)}</p> : null}<p className="mt-3 text-xs font-bold text-[var(--text-soft)]">{Array.isArray(shelf.items) ? shelf.items.length : 0} games</p></article>)}</div></section> : null}

            {highlights.length ? <section className="mt-5 card p-5 sm:p-6"><p className="section-title">Personal highlights</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Chosen moments</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((highlight) => <article key={highlight.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"><p className="text-xs font-black uppercase tracking-wider text-[var(--accent-secondary-text)]">{highlight.source_type.replace('_', ' ')}</p><h3 className="mt-2 font-black text-[var(--text-primary)]">{highlight.title}</h3>{highlight.caption ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{highlight.caption}</p> : null}{highlight.media_url ? <a href={highlight.media_url} rel="noreferrer" target="_blank" className="mt-3 inline-flex text-xs font-bold text-[var(--accent-secondary-text)]">View consented media</a> : null}</article>)}</div></section> : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div className="space-y-5">
                {showCompetitive && summary ? (
                  <section className="card p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="section-title">Competitive record</p>
                        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Mechi-verified performance</h2>
                      </div>
                      <span className="brand-chip">{summary.best_rating} peak rating</span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)]">
                      <MiniStat value={summary.total_wins} label="Wins" color="var(--brand-teal)" />
                      <MiniStat value={summary.total_losses} label="Losses" color="#fb7185" />
                      <MiniStat value={`${summary.win_rate}%`} label="Win rate" color="#7dd3fc" />
                    </div>
                  </section>
                ) : null}

                {showGames ? (
                  <section className="card p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="section-title">Game identity</p>
                        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Featured game library</h2>
                      </div>
                      <Link href={`${getPassportPath(identity.username)}/games`} className="btn-ghost text-xs">
                        Browse all <Gamepad2 size={14} />
                      </Link>
                    </div>
                    {passport.library.entries.length > 0 ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[...passport.library.entries]
                          .sort((left, right) => Number(right.is_featured) - Number(left.is_featured))
                          .slice(0, 4)
                          .map((entry) => (
                          <div key={entry.id} className="flex min-w-0 gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#142335]">
                              {entry.game.cover_url ? <Image src={entry.game.cover_url} alt="" fill sizes="64px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-black text-white/20">{entry.game.title[0]}</div>}
                            </div>
                            <div className="min-w-0 py-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate font-black text-[var(--text-primary)]">{entry.game.title}</p>
                                {entry.is_featured ? <Sparkles size={13} style={{ color: identity.card_accent }} /> : null}
                              </div>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">{PASSPORT_GAME_STATUS_LABELS[entry.play_status]}{entry.rating ? ` · ${entry.rating}/10` : ''}</p>
                              {entry.source_type === 'platform_synced' ? <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-teal)]">Synced · {entry.game.provider_attribution ?? entry.game.provider}</p> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No public game-library entries yet.</p>
                    )}
                    {identity.games.length > 0 ? <p className="mt-4 text-xs text-[var(--text-soft)]">Competitive games linked: {identity.games.map((game) => GAMES[game]?.label ?? game).join(', ')}.</p> : null}
                    {isVisible(passport, 'platforms') && identity.platforms.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {identity.platforms.map((platform) => (
                          <span key={platform} className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]">
                            {platform}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {showEvents ? (
                  <section className="card p-5 sm:p-6">
                    <p className="section-title">Event Passport</p>
                    <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">PlayMechi participation</h2>
                    {passport.events.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {passport.events.slice(0, 6).map((event) => (
                          <div key={`${event.id}-${event.slug}`} className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-black text-[var(--text-primary)]">{event.title}</p>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                {event.game && GAMES[event.game] ? GAMES[event.game].label : 'Gaming event'} · {event.status}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${event.participation_status === 'checked_in' ? 'bg-emerald-400/12 text-emerald-300' : 'bg-white/[0.05] text-white/55'}`}>
                              {event.participation_status === 'checked_in' ? 'Checked in' : event.participation_status === 'no_show' ? 'No-show' : 'Registered'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No public event participation yet.</p>
                    )}
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5">
                <section className="card p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} style={{ color: identity.card_accent }} />
                    <h2 className="font-black text-[var(--text-primary)]">Passport trust</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Verified records come from Mechi matches, event check-ins, or an identified issuer. Self-reported history is labeled separately.
                  </p>
                  <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="text-2xl font-black text-[var(--text-primary)]">{summary?.verified_records_count ?? 0}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Verified activity records</p>
                  </div>
                  {!identity.storage_ready ? (
                    <p className="mt-3 text-xs leading-5 text-amber-200/70">Passport personalization is being prepared. Existing Mechi history remains available.</p>
                  ) : null}
                </section>

                {showTeams ? (
                  <section className="card p-5">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-[var(--text-soft)]" />
                      <h2 className="font-black text-[var(--text-primary)]">Teams</h2>
                    </div>
                    {passport.teams.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {passport.teams.map((team) => (
                          <Link key={team.id} href={`/teams/${encodeURIComponent(team.slug)}`} className="block rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 hover:border-[rgba(50,224,196,0.28)]">
                            <p className="font-black text-[var(--text-primary)]">{team.name}</p>
                            <p className="mt-1 text-xs capitalize text-[var(--text-soft)]">{team.role}</p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[var(--text-secondary)]">No public team membership.</p>
                    )}
                  </section>
                ) : null}

                <section className="card p-5 text-center">
                  <Trophy className="mx-auto h-7 w-7" style={{ color: identity.card_accent }} />
                  <h2 className="mt-3 text-lg font-black text-[var(--text-primary)]">Build your gaming legacy</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Join Mechi free and turn matches, tournaments, and gaming history into one shareable Passport.</p>
                  <Link href="/register" className="btn-primary mt-4 w-full justify-center">Create Gamer Passport</Link>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.11em] text-[var(--text-soft)]">{label}</p>
        </div>
        <span className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-2.5 text-[var(--accent-secondary-text)]">{icon}</span>
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="border-r border-[var(--border-color)] p-4 text-center last:border-r-0">
      <p className="text-xl font-black" style={{ color }}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
    </div>
  );
}
