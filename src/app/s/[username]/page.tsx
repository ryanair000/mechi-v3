import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { GAMES, getConfiguredPlatformForGame, normalizeSelectedGameKeys } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { formatLastSeen } from '@/lib/last-seen';
import { getPublicProfileData } from '@/lib/public-profile';
import type { GameKey, PlatformKey } from '@/types';

interface Props {
  params: Promise<{ username: string }>;
}

function getTierName(rating: number): string {
  return getRankDivision(rating).label;
}

function getTierColor(tier: string): string {
  if (tier === 'Legend') return '#A855F7';
  if (tier === 'Diamond') return '#60A5FA';
  if (tier === 'Platinum') return '#00CED1';
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#CD7F32';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileData(username);

  if (!profile) return { title: 'Player Not Found | Mechi' };

  const tier = getTierName(profile.bestRating);
  const level = typeof profile.level === 'number' ? profile.level : 1;
  const title = `${profile.username} - ${tier} / Lv. ${level} | Mechi`;
  const description = `${profile.username} is ranked ${tier} at level ${level} on Mechi. ${profile.totalWins} wins, ${profile.totalLosses} losses. Think you can beat them?`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi-v3.vercel.app';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `${baseUrl}/s/${username}`,
      siteName: 'Mechi',
      images: [
        {
          url: `${baseUrl}/api/og/profile?username=${encodeURIComponent(username)}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/api/og/profile?username=${encodeURIComponent(username)}`],
    },
  };
}

export default async function ShareProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicProfileData(username);

  if (!profile) redirect('/');

  const tier = getTierName(profile.bestRating);
  const tierColor = getTierColor(tier);
  const level = typeof profile.level === 'number' ? profile.level : 1;
  const totalMatches = profile.totalWins + profile.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((profile.totalWins / totalMatches) * 100) : 0;
  const selectedGames = normalizeSelectedGameKeys(profile.games);
  const profilePlatforms = ((profile.platforms as PlatformKey[] | null | undefined) ?? []);
  const platformCount = profilePlatforms.length;
  const primaryChallengeGame =
    selectedGames.find(
      (game): game is GameKey => Boolean(GAMES[game as GameKey]) && GAMES[game as GameKey].mode === '1v1'
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#070b14,#0b1121_45%,#11182a)] text-white">
      <nav className="border-b border-white/[0.05] px-5 sm:px-8">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/18 font-black text-emerald-300">
              M
            </div>
            <span className="text-sm font-bold tracking-[0.22em] text-white/92">MECHI</span>
          </Link>
          <Link href="/register" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
            Join free
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#101728]/92 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="relative h-56 sm:h-72">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={`${profile.username} cover image`}
                fill
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-cover"
                preload
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,24,39,0.38),rgba(7,11,20,0.16)_45%,rgba(7,11,20,0.72))]" />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
          </div>

          <div className="px-5 pb-8 sm:px-8 sm:pb-10">
            <div className="-mt-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative h-24 w-24 overflow-hidden rounded-[1.8rem] border-4 border-[#101728] bg-white/6 shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:h-28 sm:w-28">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={`${profile.username} avatar`}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-3xl font-black"
                      style={{ background: `${tierColor}24`, color: tierColor }}
                    >
                      {usernameInitial}
                    </div>
                  )}
                </div>

                <div className="pb-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
                    Mechi profile
                  </p>
                  <h1 className="mt-2 text-3xl font-black leading-none text-white sm:text-[3.25rem]">
                    {profile.username}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/66">
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
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/72">
                      {platformCount} platform{platformCount === 1 ? '' : 's'} linked
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/72">
                      {lastSeenLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:min-w-[22rem]">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-4 text-center">
                  <div className="text-2xl font-black text-emerald-300">{profile.totalWins}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/34">Wins</div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-4 text-center">
                  <div className="text-2xl font-black text-rose-300">{profile.totalLosses}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/34">Losses</div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-4 text-center">
                  <div className="text-2xl font-black text-sky-300">{winRate}%</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/34">Win rate</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {primaryChallengeGame && primaryChallengePlatform ? (
                <ChallengePlayerButton
                  opponentId={profile.id as string}
                  opponentUsername={profile.username as string}
                  game={primaryChallengeGame}
                  platform={primaryChallengePlatform}
                  label={`Challenge on ${GAMES[primaryChallengeGame].label}`}
                  className="btn-primary"
                />
              ) : null}
              <Link href="/register" className={primaryChallengeGame && primaryChallengePlatform ? 'btn-outline' : 'btn-primary'}>
                Join Mechi Free
              </Link>
              <Link href="/login" className="btn-ghost">
                Sign In
              </Link>
            </div>

            <p className="mt-5 text-sm text-white/45">
              See their competitive setup, then join Mechi and run it back.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
