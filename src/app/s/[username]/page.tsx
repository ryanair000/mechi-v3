import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { createServiceClient } from '@/lib/supabase';
import type { RankDivision } from '@/lib/gamification';
import { ACHIEVEMENTS, getLevelFromXp, getRankDivision, withAlpha } from '@/lib/gamification';

interface Props {
  params: Promise<{ username: string }>;
}

interface PublicAchievement {
  key: string;
  title: string;
  emoji: string;
}

interface PublicProfileData {
  username: string;
  region: string;
  bestRating: number;
  totalWins: number;
  totalLosses: number;
  level: number;
  division: RankDivision;
  topAchievements: PublicAchievement[];
}

async function getProfileData(username: string): Promise<PublicProfileData | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .single();

  if (!profile) return null;

  const games = (profile.selected_games as string[]) ?? [];
  let bestRating = 1000;
  let totalWins = 0;
  let totalLosses = 0;

  for (const game of games) {
    const rating = ((profile as Record<string, unknown>)[`rating_${game}`] as number) ?? 1000;
    const wins = ((profile as Record<string, unknown>)[`wins_${game}`] as number) ?? 0;
    const losses = ((profile as Record<string, unknown>)[`losses_${game}`] as number) ?? 0;
    if (rating > bestRating) bestRating = rating;
    totalWins += wins;
    totalLosses += losses;
  }

  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', profile.id)
    .order('unlocked_at', { ascending: false })
    .limit(3);

  const topAchievements: PublicAchievement[] = achievementsError
    ? []
    : (achievements ?? [])
        .map((entry) => ACHIEVEMENTS.find((achievement) => achievement.key === entry.achievement_key))
        .filter((achievement): achievement is (typeof ACHIEVEMENTS)[number] => Boolean(achievement))
        .map((achievement) => ({
          key: achievement.key,
          title: achievement.title,
          emoji: achievement.emoji,
        }));

  const xp = (profile.xp as number | null) ?? 0;
  const level = (profile.level as number | null) ?? getLevelFromXp(xp);
  const division = getRankDivision(bestRating);

  return {
    username: profile.username,
    region: profile.region,
    bestRating,
    totalWins,
    totalLosses,
    level,
    division,
    topAchievements,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileData(username);

  if (!profile) return { title: 'Player Not Found | Mechi' };

  const title = `${profile.username} | ${profile.division.label} / Lv. ${profile.level} | Mechi`;
  const description = `${profile.username} is climbing as ${profile.division.label} / Lv. ${profile.level} on Mechi. ${profile.totalWins} wins, ${profile.totalLosses} losses. Compete. Connect. Rise.`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi.club';

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
  const profile = await getProfileData(username);

  if (!profile) redirect('/');

  const totalMatches = profile.totalWins + profile.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((profile.totalWins / totalMatches) * 100) : 0;

  return (
    <div className="page-base flex flex-col">
      <nav className="landing-shell flex h-16 items-center border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
      </nav>

      <div className="landing-shell flex flex-1 items-center justify-center py-16">
        <div className="card circuit-panel w-full max-w-2xl p-8 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="avatar-shell flex h-20 w-20 items-center justify-center text-3xl font-bold text-[var(--brand-teal)]">
                {profile.username[0].toUpperCase()}
              </div>
              <div>
                <p className="brand-kicker">Player Profile</p>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
                  {profile.username}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{profile.region}</p>
              </div>
            </div>

            <div
              className="rounded-2xl border px-5 py-4"
              style={{
                color: profile.division.color,
                backgroundColor: withAlpha(profile.division.color, '14'),
                borderColor: withAlpha(profile.division.color, '30'),
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Current Climb
              </p>
              <p className="mt-2 text-xl font-black">{profile.division.label}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">Lv. {profile.level}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 text-center">
              <div className="text-2xl font-black text-[var(--brand-teal)]">{profile.totalWins}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Wins</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 text-center">
              <div className="text-2xl font-black text-[var(--brand-coral)]">{profile.totalLosses}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Losses</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 text-center">
              <div className="text-2xl font-black text-[var(--text-primary)]">{winRate}%</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Win rate</div>
            </div>
          </div>

          {profile.topAchievements.length > 0 && (
            <div className="mt-6">
              <p className="section-title">Top Unlocks</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.topAchievements.map((achievement) => (
                  <span
                    key={achievement.key}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]"
                  >
                    {achievement.emoji} {achievement.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary">
              Challenge Them on Mechi
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign In
            </Link>
          </div>

          <p className="mt-8 text-xs text-[var(--text-soft)]">Compete. Connect. Rise.</p>
        </div>
      </div>
    </div>
  );
}
