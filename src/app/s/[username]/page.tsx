import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Props {
  params: Promise<{ username: string }>;
}

function getTierName(rating: number): string {
  if (rating >= 1700) return 'Legend';
  if (rating >= 1500) return 'Diamond';
  if (rating >= 1300) return 'Platinum';
  if (rating >= 1100) return 'Gold';
  if (rating >= 900) return 'Silver';
  return 'Bronze';
}

async function getProfileData(username: string) {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, region, platforms, selected_games, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6')
    .ilike('username', username)
    .single();

  if (!profile) return null;

  const games = (profile.selected_games as string[]) ?? [];
  let bestRating = 1000;
  let totalWins = 0;
  let totalLosses = 0;
  for (const g of games) {
    const r = (profile as Record<string, unknown>)[`rating_${g}`] as number ?? 1000;
    const w = (profile as Record<string, unknown>)[`wins_${g}`] as number ?? 0;
    const l = (profile as Record<string, unknown>)[`losses_${g}`] as number ?? 0;
    if (r > bestRating) bestRating = r;
    totalWins += w;
    totalLosses += l;
  }

  return { ...profile, bestRating, totalWins, totalLosses };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileData(username);

  if (!profile) return { title: 'Player Not Found | Mechi' };

  const tier = getTierName(profile.bestRating);
  const title = `${profile.username} — ${tier} (${profile.bestRating} ELO) | Mechi`;
  const description = `${profile.username} is ranked ${tier} with ${profile.bestRating} ELO on Mechi. ${profile.totalWins} wins, ${profile.totalLosses} losses. Think you can beat them?`;
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
      images: [{ url: `${baseUrl}/api/og/profile?username=${encodeURIComponent(username)}`, width: 1200, height: 630, alt: title }],
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

  const tier = getTierName(profile.bestRating);
  const totalMatches = profile.totalWins + profile.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((profile.totalWins / totalMatches) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="px-5 sm:px-8 h-16 flex items-center border-b border-white/[0.04]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">M</div>
          <span className="font-bold text-sm">Mechi</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-3xl font-bold text-emerald-400 mx-auto mb-4">
            {profile.username[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold mb-1">{profile.username}</h1>
          <p className="text-white/40 text-sm mb-4">{profile.region}</p>

          <div className="inline-flex items-center gap-2 bg-white/[0.04] rounded-xl px-5 py-3 mb-6">
            <span className="text-lg font-bold" style={{ color: tier === 'Legend' ? '#A855F7' : tier === 'Diamond' ? '#60A5FA' : tier === 'Platinum' ? '#00CED1' : tier === 'Gold' ? '#FFD700' : tier === 'Silver' ? '#C0C0C0' : '#CD7F32' }}>
              {tier}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white font-bold">{profile.bestRating} ELO</span>
          </div>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{profile.totalWins}</div>
              <div className="text-[11px] text-white/20 uppercase">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{profile.totalLosses}</div>
              <div className="text-[11px] text-white/20 uppercase">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{winRate}%</div>
              <div className="text-[11px] text-white/20 uppercase">Win Rate</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary">
              Challenge Them — Join Free
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign In
            </Link>
          </div>

          <p className="text-white/15 text-xs mt-8">
            Kenya&apos;s gaming matchmaking platform
          </p>
        </div>
      </div>
    </div>
  );
}
