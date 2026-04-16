import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getGameImage } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import { ACHIEVEMENTS, getLevelFromXp, getRankDivision } from '@/lib/gamification';
import { getProfileShareStats } from '@/lib/share';
import type { GameKey } from '@/types';

export const runtime = 'edge';

function notFoundCard(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1121',
          color: 'white',
          fontSize: 32,
          fontFamily: 'sans-serif',
        }}
      >
        {message}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const logoSrc = `${origin}/mechi-logo.png`;

  if (!username) {
    return notFoundCard('Mechi / Player not found');
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .single();

  if (!profile) {
    return notFoundCard('Mechi / Player not found');
  }

  const { games, bestRating, totalWins, totalLosses } = getProfileShareStats(
    profile as Record<string, unknown>
  );
  let topGame: string | null = null;

  for (const game of games) {
    const rating = ((profile as Record<string, unknown>)[`rating_${game}`] as number) ?? 1000;
    if (topGame === null || rating > (((profile as Record<string, unknown>)[`rating_${topGame}`] as number) ?? 1000)) {
      topGame = game;
    }
  }

  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', profile.id)
    .order('unlocked_at', { ascending: false })
    .limit(3);

  const topAchievements = achievementsError
    ? []
    : (achievements ?? [])
        .map((entry) => ACHIEVEMENTS.find((achievement) => achievement.key === entry.achievement_key))
        .filter((achievement): achievement is (typeof ACHIEVEMENTS)[number] => Boolean(achievement))
        .slice(0, 3)
        .map((achievement) => ({
          key: achievement.key,
          title: achievement.title,
          emoji: achievement.emoji,
        }));

  const division = getRankDivision(bestRating);
  const xp = (profile.xp as number | null) ?? 0;
  const level = (profile.level as number | null) ?? getLevelFromXp(xp);
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const platforms = (profile.platforms as string[]) ?? [];
  const gameImageUrl = topGame ? getGameImage(topGame as GameKey) : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0B1121 0%, #152033 55%, #08101C 100%)',
          padding: '52px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {gameImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gameImageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.08,
            }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '42px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '18px',
                background: 'transparent',
                border: '1px solid transparent',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Mechi logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 800 }}>MECHI</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.58)' }}>
                Compete. Connect. Rise.
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              borderRadius: '999px',
              background: 'rgba(255,107,107,0.12)',
              color: '#FF6B6B',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Player Profile
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, gap: '36px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '340px',
              padding: '32px',
              borderRadius: '32px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '120px',
                height: '120px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '30px',
                background: 'rgba(50,224,196,0.12)',
                border: '2px solid rgba(50,224,196,0.28)',
                color: '#32E0C4',
                fontSize: '52px',
                fontWeight: 800,
              }}
            >
              {profile.username[0].toUpperCase()}
            </div>
            <span style={{ marginTop: '22px', fontSize: '34px', fontWeight: 800 }}>
              {profile.username}
            </span>
            <span style={{ marginTop: '8px', fontSize: '16px', color: 'rgba(255,255,255,0.56)' }}>
              {profile.region} / {platforms.length} platform{platforms.length === 1 ? '' : 's'}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '24px',
                padding: '12px 18px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ color: division.color, fontSize: '18px', fontWeight: 800 }}>
                {division.label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.28)' }}>/</span>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>Lv. {level}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '28px',
                borderRadius: '30px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.56)' }}>
                Organized competition across your selected games.
              </span>
              <span style={{ marginTop: '16px', fontSize: '30px', fontWeight: 800 }}>
                {games.length} active titles on Mechi
              </span>
              {topAchievements.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  {topAchievements.map((achievement) => (
                    <div
                      key={achievement.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      <span>{achievement.emoji}</span>
                      <span>{achievement.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '18px' }}>
              {[
                { label: 'Wins', value: String(totalWins), color: '#32E0C4' },
                { label: 'Losses', value: String(totalLosses), color: '#FF6B6B' },
                { label: 'Win Rate', value: `${winRate}%`, color: 'white' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    padding: '26px 22px',
                    borderRadius: '28px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.56)' }}>{stat.label}</span>
                  <span style={{ marginTop: '12px', fontSize: '34px', fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 28px',
                borderRadius: '28px',
                background: 'linear-gradient(90deg, rgba(50,224,196,0.12), rgba(255,107,107,0.12))',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 700 }}>
                Challenge this profile on Mechi.
              </span>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)' }}>
                mechi.club
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
