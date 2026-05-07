import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { GAMES } from '@/lib/config';
import { isE2ETournamentFixture, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { createServiceClient } from '@/lib/supabase';
import {
  getTournamentPaymentMetrics,
  getTournamentPrizePoolLabel,
  getTournamentPrizeSnapshot,
} from '@/lib/tournament-metrics';
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
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return notFoundCard('Mechi / Tournament not found');

  const supabase = createServiceClient();
  let tournamentQuery = supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug);

  if (shouldHideE2EFixtures()) {
    tournamentQuery = tournamentQuery.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
  }

  const { data: tournament } = await tournamentQuery.single();

  if (!tournament || isE2ETournamentFixture(tournament)) return notFoundCard('Mechi / Tournament not found');

  const { data: players } = await supabase
    .from('tournament_players')
    .select('payment_status')
    .eq('tournament_id', tournament.id)
    .in('payment_status', ['paid', 'free']);

  const game = GAMES[tournament.game as GameKey]?.label ?? tournament.game;
  const metrics = getTournamentPaymentMetrics(
    ((players ?? []) as Array<{ payment_status: string | null | undefined }>).map((player) => ({
      payment_status: player.payment_status,
    }))
  );
  const prize = getTournamentPrizeSnapshot({
    entryFee: Number(tournament.entry_fee ?? 0),
    paidPlayerCount: metrics.paidCount,
    feeRate: Number(tournament.platform_fee_rate ?? 5),
    prizePoolMode: tournament.prize_pool_mode as string | null | undefined,
    storedPrizePool: Number(tournament.prize_pool ?? 0),
    storedPlatformFee: Number(tournament.platform_fee ?? 0),
  });
  const playerCount = metrics.confirmedCount;

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
          background: 'linear-gradient(135deg, #0B1121 0%, #121D2D 52%, #08101C 100%)',
          color: 'white',
          padding: '54px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-14%',
            right: '-8%',
            width: '44%',
            height: '84%',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'radial-gradient(circle, rgba(255,107,107,0.14) 0%, rgba(255,107,107,0.03) 52%, transparent 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-22%',
            left: '-12%',
            width: '48%',
            height: '82%',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'radial-gradient(circle, rgba(50,224,196,0.16) 0%, rgba(50,224,196,0.04) 48%, transparent 70%)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.12em' }}>MECHI</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
            <Metric
              label="Prize"
              value={getTournamentPrizePoolLabel({
                prizePool: prize.prizePool,
                entryFee: Number(tournament.entry_fee ?? 0),
                prizePoolMode: tournament.prize_pool_mode as string | null | undefined,
              })}
              color="white"
            />
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
