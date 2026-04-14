import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLevelFromXp, getRankDivision } from '@/lib/gamification';

export const runtime = 'edge';

const GAME_LABELS: Record<string, string> = {
  efootball: 'eFootball 2025',
  fc26: 'EA FC 26',
  mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26',
  tekken8: 'Tekken 8',
  sf6: 'Street Fighter 6',
  cs2: 'CS2',
  valorant: 'Valorant',
  mariokart: 'Mario Kart 8',
  smashbros: 'Super Smash Bros',
  rocketleague: 'Rocket League',
};

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
  const matchId = searchParams.get('id');
  const logoSrc = `${origin}/mechi-logo.png`;

  if (!matchId) {
    return notFoundCard('Mechi / Match not found');
  }

  const supabase = createServiceClient();
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();

  if (!match) {
    return notFoundCard('Mechi / Match not found');
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [match.player1_id, match.player2_id]);

  const p1 = profiles?.find((profile: { id: string }) => profile.id === match.player1_id);
  const p2 = profiles?.find((profile: { id: string }) => profile.id === match.player2_id);
  const winner = match.winner_id === match.player1_id ? p1 : p2;
  const loser = match.winner_id === match.player1_id ? p2 : p1;
  const winnerSummary =
    match.winner_id === match.player1_id
      ? match.gamification_summary_p1 ?? null
      : match.gamification_summary_p2 ?? null;
  const winnerRating = ((winner as Record<string, unknown> | undefined)?.[`rating_${match.game}`] as number) ?? 1000;
  const division = getRankDivision(winnerRating);
  const winnerXp = (winner?.xp as number | null) ?? 0;
  const winnerLevel = winnerSummary?.newLevel ?? ((winner?.level as number | null) ?? getLevelFromXp(winnerXp));
  const gameLabel = GAME_LABELS[match.game] ?? match.game;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0B1121 0%, #152033 55%, #08101C 100%)',
          padding: '52px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '38px',
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
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Mechi logo" style={{ width: '100%', height: '100%' }} />
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
            {gameLabel}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '28px' }}>
          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '34px 24px',
              borderRadius: '32px',
              background: 'rgba(50,224,196,0.08)',
              border: '1px solid rgba(50,224,196,0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '128px',
                height: '128px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '32px',
                background: 'rgba(50,224,196,0.14)',
                color: '#32E0C4',
                fontSize: '52px',
                fontWeight: 800,
              }}
            >
              {winner?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ marginTop: '20px', fontSize: '32px', fontWeight: 800 }}>
              {winner?.username ?? 'Player'}
            </span>
            <span style={{ marginTop: '10px', fontSize: '18px', color: '#32E0C4', fontWeight: 700 }}>
              Winner
            </span>
            <span style={{ marginTop: '16px', fontSize: '24px', fontWeight: 800, color: division.color }}>
              {division.label} / Lv. {winnerLevel}
            </span>
            {winnerSummary && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '999px',
                    background: 'rgba(50,224,196,0.12)',
                    color: '#32E0C4',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  +{winnerSummary.xpEarned} XP
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255,107,107,0.12)',
                    color: '#FF6B6B',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  +{winnerSummary.mpEarned} MP
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              width: '120px',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.18)',
            }}
          >
            VS
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '34px 24px',
              borderRadius: '32px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '128px',
                height: '128px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '32px',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.56)',
                fontSize: '52px',
                fontWeight: 800,
              }}
            >
              {loser?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ marginTop: '20px', fontSize: '32px', fontWeight: 800 }}>
              {loser?.username ?? 'Player'}
            </span>
            <span style={{ marginTop: '10px', fontSize: '18px', color: 'rgba(255,255,255,0.56)', fontWeight: 700 }}>
              Runner-up
            </span>
            <span style={{ marginTop: '16px', fontSize: '18px', color: 'rgba(255,255,255,0.56)' }}>
              Fair match. Clean finish.
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.56)' }}>Climb</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: division.color }}>{division.label}</span>
          </div>
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.58)' }}>mechi.club</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
