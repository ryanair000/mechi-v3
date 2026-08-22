import { mkdir, writeFile } from 'node:fs/promises';
import { buildGamerCvPdf } from '../src/lib/passport-cv-pdf';
import type { PassportPublicCompetitiveResume } from '../src/lib/passport-resume-types.ts';

const resume: PassportPublicCompetitiveResume = {
  access: 'public',
  generated_at: '2026-08-12T14:00:00.000Z',
  identity: {
    username: 'mechi_champion',
    display_name: 'Mechi Champion',
  },
  games: [
    {
      game: 'efootball', label: 'eFootball', current_rating: 1475,
      peak_rating: 1530, matches: 42, wins: 30, win_rate: 71,
      tournament_entries: 5, tournament_wins: 2,
    },
    {
      game: 'codm', label: 'Call of Duty Mobile', current_rating: 1320,
      peak_rating: 1390, matches: 28, wins: 17, win_rate: 61,
      tournament_entries: 3, tournament_wins: 0,
    },
  ],
  seasons: [{
    id: 'season-snapshot-1', title: 'Mechi 2026 Season One',
    game: 'efootball', peak_rating: 1505, matches: 18, tournament_wins: 1,
  }],
  matches: Array.from({ length: 12 }, (_, index) => ({
    id: `match-${index}`,
    game: index % 2 ? 'codm' : 'efootball',
    opponent_username: `rival_${index + 1}`,
    result: index % 4 === 3 ? 'loss' as const : 'win' as const,
    score: index % 2 ? '3-1' : '2-0',
    completed_at: `2026-08-${String(10 - Math.floor(index / 2)).padStart(2, '0')}T10:00:00.000Z`,
  })),
  tournaments: [],
  teams: [{
    name: 'Nairobi Titans', role: 'captain', membership_status: 'active',
    joined_at: '2025-01-05T10:00:00.000Z',
  }],
  events: Array.from({ length: 8 }, (_, index) => ({
    verification_token: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    event_title: index < 4 ? 'PlayMechi Nairobi Open' : 'Mechi Community Finals',
    stamp_type: index % 3 === 0
      ? 'placement' as const
      : index % 2
        ? 'competed' as const
        : 'checked_in' as const,
    game: index % 2 ? 'codm' : 'efootball',
    placement: index % 3 === 0 ? index + 1 : null,
    occurred_at: `2026-07-${String(index + 10).padStart(2, '0')}T10:00:00.000Z`,
  })),
  presentation: {
    headline: 'Verified eFootball competitor, CODM player, and community captain.',
    inquiry_url: 'https://mechi.club/@mechi_champion',
  },
};

await mkdir(new URL('../output/pdf/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../output/pdf/mechi-v5-gamer-cv-phase4-fixture.pdf', import.meta.url),
  buildGamerCvPdf(resume)
);
