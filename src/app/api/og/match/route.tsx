import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLevelFromXp, getRankDivision } from '@/lib/gamification';

export const runtime = 'edge';

const GAME_LABELS: Record<string, string> = {
  efootball: 'eFootball 2026',
  efootball_mobile: 'eFootball 2026 Mobile',
  fc26: 'EA FC 26',
  mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26',
  tekken8: 'Tekken 8',
  sf6: 'Street Fighter 6',
  ludo: 'Ludo',
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
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('id');

    if (!matchId) {
      return notFoundCard('Mechi / Match not found');
    }

    const supabase = createServiceClient();
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .eq('status', 'completed')
      .single();

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
    const scoreline =
      match.player1_score !== null &&
      match.player1_score !== undefined &&
      match.player2_score !== null &&
      match.player2_score !== undefined
        ? `${match.player1_score}-${match.player2_score}`
        : null;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #0B1121 0%, #152033 55%, #08101C 100%)',
            padding: '56px',
            color: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '0.12em' }}>MECHI</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.58)' }}>Compete. Connect. Rise.</span>
            </div>
            <div
              style={{
                display: 'flex',
                padding: '10px 18px',
                borderRadius: '999px',
                background: 'rgba(255,107,107,0.14)',
                color: '#FF6B6B',
                fontSize: '15px',
                fontWeight: 800,
              }}
            >
              {gameLabel}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '48px' }}>
            <span style={{ fontSize: '18px', color: '#32E0C4', fontWeight: 900, letterSpacing: '0.2em' }}>
              MATCH COMPLETE
            </span>
            <span
              style={{
                marginTop: '18px',
                fontSize: '72px',
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: '-0.06em',
              }}
            >
              {winner?.username ?? 'Player'} beat {loser?.username ?? 'Player'}
            </span>
            <span style={{ marginTop: '20px', fontSize: '24px', color: 'rgba(255,255,255,0.68)' }}>
              {scoreline
                ? `Score locked at ${scoreline}. Progress updated on Mechi.`
                : 'Clean result lock. Progress updated on Mechi.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '48px' }}>
            <div
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                padding: '28px',
                borderRadius: '30px',
                background: 'rgba(50,224,196,0.08)',
                border: '1px solid rgba(50,224,196,0.18)',
              }}
            >
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.58)' }}>Winner</span>
              <span style={{ marginTop: '12px', fontSize: '34px', fontWeight: 900 }}>
                {winner?.username ?? 'Player'}
              </span>
              <span style={{ marginTop: '12px', fontSize: '22px', fontWeight: 800, color: division.color }}>
                {division.label} / Lv. {winnerLevel}
              </span>
              {winnerSummary ? (
                <span style={{ marginTop: '12px', fontSize: '18px', color: '#32E0C4' }}>
                  +{winnerSummary.xpEarned} XP / +{winnerSummary.mpEarned} MP
                </span>
              ) : null}
              {scoreline ? (
                <span style={{ marginTop: '12px', fontSize: '18px', color: 'rgba(255,255,255,0.74)' }}>
                  Final score {scoreline}
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                padding: '28px',
                borderRadius: '30px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.58)' }}>Opponent</span>
              <span style={{ marginTop: '12px', fontSize: '34px', fontWeight: 900 }}>
                {loser?.username ?? 'Player'}
              </span>
              <span style={{ marginTop: '12px', fontSize: '20px', color: 'rgba(255,255,255,0.62)' }}>
                Fair match. Clean finish.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
              Ranked climb updated
            </span>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>mechi.club</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    console.error('[OG Match] Error:', error);
    return notFoundCard('Mechi / Match card unavailable');
  }
}
