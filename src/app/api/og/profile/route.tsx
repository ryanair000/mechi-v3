import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700',
  Platinum: '#00CED1', Diamond: '#60A5FA', Legend: '#A855F7',
};

function getTierInfo(rating: number): { name: string; color: string } {
  if (rating >= 1700) return { name: 'Legend', color: TIER_COLORS.Legend };
  if (rating >= 1500) return { name: 'Diamond', color: TIER_COLORS.Diamond };
  if (rating >= 1300) return { name: 'Platinum', color: TIER_COLORS.Platinum };
  if (rating >= 1100) return { name: 'Gold', color: TIER_COLORS.Gold };
  if (rating >= 900) return { name: 'Silver', color: TIER_COLORS.Silver };
  return { name: 'Bronze', color: TIER_COLORS.Bronze };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#030712', color: 'white', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Mechi - Player not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, region, platforms, selected_games, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6')
    .ilike('username', username)
    .single();

  if (!profile) {
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#030712', color: 'white', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Mechi - Player not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

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

  const tier = getTierInfo(bestRating);
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const platforms = (profile.platforms as string[]) ?? [];

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #030712 0%, #0a1628 50%, #030712 100%)',
      padding: '60px', color: 'white', fontFamily: 'sans-serif',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800,
          }}>M</div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Mechi</span>
        </div>
        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>Player Profile</span>
      </div>

      {/* Profile */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '60px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '140px', height: '140px', borderRadius: '32px',
            background: `${tier.color}20`, border: `3px solid ${tier.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '56px', fontWeight: 800, color: tier.color,
          }}>
            {profile.username[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '32px', fontWeight: 800 }}>{profile.username}</span>
          <div style={{
            fontSize: '16px', fontWeight: 700, color: tier.color,
            background: `${tier.color}15`, padding: '8px 24px', borderRadius: '999px',
            border: `1px solid ${tier.color}30`,
          }}>
            {tier.name} · {bestRating} ELO
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[
              { label: 'Wins', value: String(totalWins), color: '#10B981' },
              { label: 'Losses', value: String(totalLosses), color: '#EF4444' },
              { label: 'Win Rate', value: `${winRate}%`, color: '#3B82F6' },
              { label: 'Games', value: String(games.length), color: 'rgba(255,255,255,0.6)' },
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
              {profile.region} · {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>mechi-v3.vercel.app</span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>Think you can beat them? Join free 🇰🇪</span>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
