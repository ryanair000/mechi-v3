import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { GAMES, getConfiguredPlatformForGame, normalizeSelectedGameKeys } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { formatLastSeen } from '@/lib/last-seen';
import { getPublicProfileData } from '@/lib/public-profile';
import type { GameKey, PlatformKey } from '@/types';

type PlayerProfilePageProps = {
  params: Promise<{ username: string }>;
};

function getTierName(rating: number) {
  return getRankDivision(rating).label;
}

function getTierColor(tier: string) {
  if (tier === 'Legend') return '#A855F7';
  if (tier === 'Diamond') return '#60A5FA';
  if (tier === 'Platinum') return '#00CED1';
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#CD7F32';
}

export async function generateMetadata({
  params,
}: PlayerProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileData(username);
  return {
    title: profile ? `${profile.username} | Player Profile` : 'Player Profile',
  };
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfileData(username);

  if (!profile) {
    notFound();
  }

  const tier = getTierName(profile.bestRating);
  const tierColor = getTierColor(tier);
  const level = typeof profile.level === 'number' ? profile.level : 1;
  const totalMatches = profile.totalWins + profile.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((profile.totalWins / totalMatches) * 100) : 0;
  const selectedGames = normalizeSelectedGameKeys(profile.games);
  const profilePlatforms = ((profile.platforms as PlatformKey[] | null | undefined) ?? []);
  const primaryChallengeGame =
    selectedGames.find(
      (game): game is GameKey =>
        Boolean(GAMES[game as GameKey]) && GAMES[game as GameKey].mode === '1v1'
    ) ?? null;
  const primaryChallengePlatform = primaryChallengeGame
    ? getConfiguredPlatformForGame(
        primaryChallengeGame,
        (profile.game_ids as Record<string, string> | undefined) ?? {},
        profilePlatforms
      )
    : null;
  const avatarUrl = typeof profile.avatar_url === 'string' ? profile.avatar_url : null;
  const coverUrl = typeof profile.cover_url === 'string' ? profile.cover_url : null;
  const usernameInitial = profile.username[0]?.toUpperCase() ?? '?';
  const lastSeenLabel = formatLastSeen(profile.last_match_date);

  return (
    <div className="page-container space-y-5">
      <section className="card relative min-h-[360px] overflow-hidden p-0">
        <div className="absolute inset-0 bg-[var(--surface-strong)]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${profile.username} cover image`}
              fill
              priority
              sizes="(min-width: 1280px) 980px, 100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(50,224,196,0.16),transparent_32%),linear-gradient(180deg,rgba(7,12,22,0.18),rgba(7,12,22,0.86))]" />
        </div>

        <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-24 w-24 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[rgba(7,12,22,0.72)] text-3xl font-black shadow-[var(--shadow-soft)] sm:h-28 sm:w-28">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: `${tierColor}24`, color: tierColor }}
                  >
                    {usernameInitial}
                  </div>
                )}
              </div>

              <div>
                <p className="section-title">Player profile</p>
                <h1 className="mt-2 text-3xl font-black leading-none text-[var(--text-primary)] sm:text-[3rem]">
                  {profile.username}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {profile.location_label || 'Location not set'} with {selectedGames.length}{' '}
                  {selectedGames.length === 1 ? 'game' : 'games'} on Mechi.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: `${tierColor}24`, color: tierColor }}
                  >
                    {tier} / Lv. {level}
                  </span>
                  <span className="brand-chip px-3 py-1">
                    {profilePlatforms.length} platform{profilePlatforms.length === 1 ? '' : 's'} linked
                  </span>
                  <span className="brand-chip px-3 py-1">{lastSeenLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-[22rem]">
              {[
                ['Wins', profile.totalWins, 'text-[var(--brand-teal)]'],
                ['Losses', profile.totalLosses, 'text-[#ff9a9a]'],
                ['Win rate', `${winRate}%`, 'text-[#7dd3fc]'],
              ].map(([label, value, className]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[rgba(7,12,22,0.62)] px-4 py-4 text-center backdrop-blur"
                >
                  <div className={`text-2xl font-black ${className}`}>{value}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {primaryChallengeGame && primaryChallengePlatform ? (
              <ChallengePlayerButton
                opponentId={profile.id}
                opponentUsername={profile.username}
                game={primaryChallengeGame}
                platform={primaryChallengePlatform}
                label={`Challenge on ${GAMES[primaryChallengeGame].label}`}
                className="btn-primary"
              />
            ) : null}
            <Link href="/leaderboard" className="btn-outline">
              Back to leaderboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
