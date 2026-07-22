import { NextResponse } from 'next/server';
import { getPublicTournamentBySlug } from '@/lib/public-tournament-data';

const PUBLIC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const tournament = await getPublicTournamentBySlug(slug);
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404, headers: PUBLIC_HEADERS }
      );
    }

    return NextResponse.json({ tournament }, { headers: PUBLIC_HEADERS });
  } catch (error) {
    console.error('[PublicTournamentDetail] Error:', error);
    return NextResponse.json(
      { error: 'Could not load public tournament' },
      { status: 500, headers: PUBLIC_HEADERS }
    );
  }
}
