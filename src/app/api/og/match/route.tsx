import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#00CED1',
  Diamond: '#60A5FA',
  Legend: '#A855F7',
};

function getTierName(rating: number): string {
  if (rating >= 1700) return 'Legend';
  if (rating >= 1500) return 'Diamond';
  if (rating >= 1300) return 'Platinum';
  if (rating >= 1100) return 'Gold';
  if (rating >= 900) return 'Silver';
  return 'Bronze';
}

const GAME_LABELS: Record<string, string> = {
  efootball: 'eFootball 2025', fc26: 'EA FC 26', mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26', tekken8: 'Tekken 8', sf6: 'Street Fighter 6',
  cs2: 'CS2', valorant: 'Valorant', mariokart: 'Mario Kart 8',
  smashbros: 'Super Smash Bros', rocketleague: 'Rocket League',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('id');

  if (!matchId) {
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#030712', color: 'white', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Mechi - Match not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const supabase = createServiceClient();
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();

  if (!match) {
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#030712', color: 'white', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Mechi - Match not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', [match.player1_id, match.player2_id]);

  const p1 = profiles?.find((p: { id: string }) => p.id === match.player1_id);
  const p2 = profiles?.find((p: { id: string }) => p.id === match.player2_id);
  const winner = match.winner_id === match.player1_id ? p1 : p2;
  const loser = match.winner_id === match.player1_id ? p2 : p1;
  const ratingChange = match.winner_id === match.player1_id ? match.rating_change_p1 : match.rating_change_p2;
  const winnerRating = 1000 + (ratingChange ?? 0);
  const tierName = getTierName(winnerRating);
  const tierColor = TIER_COLORS[tierName] ?? '#10B981';
  const gameLabel = GAME_LABELS[match.game] ?? match.game;

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #030712 0%, #0a1628 50%, #030712 100%)',
      padding: '60px', color: 'white', fontFamily: 'sans-serif',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, color: 'white',
          }}>M</div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Mechi</span>
        </div>
        <div style={{
          fontSize: '16px', fontWeight: 600, color: '#10B981',
          background: 'rgba(16,185,129,0.1)', padding: '8px 20px', borderRadius: '999px',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          {gameLabel}
        </div>
      </div>

      {/* Match result */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '60px' }}>
        {/* Winner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '28px',
            background: `rgba(16,185,129,0.15)`, border: '3px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', fontWeight: 800, color: '#10B981',
          }}>
            {winner?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>{winner?.username ?? 'Player'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🏆</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
              +{ratingChange ?? 0}
            </span>
          </div>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '48px', fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>VS</span>
        </div>

        {/* Loser */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '28px',
            background: 'rgba(255,255,255,0.05)', border: '3px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', fontWeight: 800, color: 'rgba(255,255,255,0.4)',
          }}>
            {loser?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{loser?.username ?? 'Player'}</span>
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.2)' }}>Defeated</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>mechi-v3.vercel.app</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: tierColor, background: `${tierColor}20`, padding: '6px 16px', borderRadius: '999px' }}>
            {tierName}
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Kenya Gaming 🇰🇪</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
