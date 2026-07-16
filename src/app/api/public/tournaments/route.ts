import { NextRequest, NextResponse } from 'next/server';
import { listPublicTournaments } from '@/lib/public-tournament-data';

const PUBLIC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const tournaments = await listPublicTournaments({
      status: searchParams.get('status'),
      game: searchParams.get('game'),
      country: searchParams.get('country'),
      limit: Number(searchParams.get('limit') ?? 24),
    });

    return NextResponse.json(
      {
        tournaments,
        count: tournaments.length,
      },
      { headers: PUBLIC_HEADERS }
    );
  } catch (error) {
    console.error('[PublicTournaments] Error:', error);
    return NextResponse.json(
      { error: 'Could not load public tournaments' },
      { status: 500, headers: PUBLIC_HEADERS }
    );
  }
}
