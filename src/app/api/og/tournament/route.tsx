import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { GAMES } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
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
  const slug = searchParams.get('slug');
  const logoSrc = `${origin}/mechi-logo.png`;

  if (!slug) return notFoundCard('Mechi / Tournament not found');

  const supabase = createServiceClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, player_count:tournament_players(count)')
    .eq('slug', slug)
    .single();

  if (!tournament) return notFoundCard('Mechi / Tournament not found');

  const game = GAMES[tournament.game as GameKey]?.label ?? tournament.game;
  const playerCount = Array.isArray(tournament.player_count)
    ? tournament.player_count[0]?.count ?? 0
    : 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0B1121 0%, #121D2D 52%, #08101C 100%)',
          color: 'white',
          padding: '54px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Mechi" style={{ width: 58, height: 58, objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.12em' }}>MECHI</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)' }}>Compete. Connect. Rise.</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(255,107,107,0.14)',
              color: '#FF6B6B',
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {tournament.status}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 34 }}>
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <span style={{ color: '#32E0C4', fontSize: 18, fontWeight: 900, letterSpacing: '0.24em' }}>
              {game}
            </span>
            <span style={{ marginTop: 18, fontSize: 62, lineHeight: 1, fontWeight: 950, letterSpacing: '-0.06em' }}>
              {tournament.title}
            </span>
            <span style={{ marginTop: 22, maxWidth: 700, fontSize: 24, color: 'rgba(255,255,255,0.68)' }}>
              Bracket is live on Mechi. Pull up, play clean, and move through the path.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              width: 300,
              flexDirection: 'column',
              gap: 16,
              padding: 28,
              borderRadius: 34,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Metric label="Players" value={`${playerCount}/${tournament.size}`} color="#32E0C4" />
            <Metric label="Entry" value={tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'} color="#FF6B6B" />
            <Metric label="Prize" value={tournament.prize_pool > 0 ? `KES ${tournament.prize_pool}` : 'Glory'} color="white" />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ color, fontSize: 28, fontWeight: 900 }}>{value}</span>
      <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: 13, fontWeight: 800, letterSpacing: '0.14em' }}>
        {label}
      </span>
    </div>
  );
}
