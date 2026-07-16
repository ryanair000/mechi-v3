import { listPublicTournaments } from '@/lib/public-tournament-data';
import type { CountryKey } from '@/types';

export async function getHomepageTournaments(country?: CountryKey | null) {
  try {
    return await listPublicTournaments({
      status: 'all',
      country: country ?? null,
      limit: 6,
    });
  } catch (error) {
    console.error('[HomepageTournaments] Could not load public tournaments:', error);
    return [];
  }
}
