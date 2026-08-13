import { NextRequest, NextResponse } from 'next/server';
import { searchPassportGameCatalog } from '@/lib/passport-games';
import type { PlatformKey } from '@/types';

const PLATFORMS = ['ps', 'xbox', 'nintendo', 'mobile', 'pc'];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.slice(0, 100) ?? '';
  const platformValue = request.nextUrl.searchParams.get('platform');
  const platform = platformValue && PLATFORMS.includes(platformValue)
    ? platformValue as PlatformKey
    : null;
  const genre = request.nextUrl.searchParams.get('genre')?.slice(0, 60) ?? null;
  const result = await searchPassportGameCatalog({ query, platform, genre, limit: 40 });
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}
