import { mkdir, writeFile } from 'node:fs/promises';
import pdfModule from '../src/lib/passport-cv-pdf';
import type { PassportCompetitiveResume } from '../src/lib/passport-resume-types.ts';

const { buildGamerCvPdf } = pdfModule as typeof import('../src/lib/passport-cv-pdf');

const resume: PassportCompetitiveResume = {
  access: 'public', storage_ready: true, generated_at: '2026-08-12T14:00:00.000Z',
  identity: {
    user_id: '00000000-0000-0000-0000-000000000001', username: 'mechi_champion', display_name: 'Mechi Champion',
    avatar_url: null, cover_image_url: null, bio: 'Competitive player and community organizer.', gamer_since: 2018,
    archetypes: ['Competitor'], current_status: 'Looking for team', country_code: 'KE', city: 'Nairobi',
    timezone: 'Africa/Nairobi', languages: ['English', 'Swahili'], platforms: ['PlayStation', 'Mobile'],
    favorite_genres: ['Sports', 'Shooter'], verification_tier: 'mechi_verified', verification_score: 92,
    is_discoverable: true, default_visibility: 'public', field_visibility: {}, updated_at: '2026-08-12T14:00:00.000Z',
  },
  games: [
    { game: 'efootball', label: 'eFootball', current_rating: 1475, peak_rating: 1530, matches: 42, wins: 30, losses: 8, draws: 4, win_rate: 71, tournament_entries: 5, tournament_wins: 2, podiums: 3, latest_match_at: '2026-08-10T10:00:00.000Z' },
    { game: 'codm', label: 'Call of Duty Mobile', current_rating: 1320, peak_rating: 1390, matches: 28, wins: 17, losses: 11, draws: 0, win_rate: 61, tournament_entries: 3, tournament_wins: 0, podiums: 1, latest_match_at: '2026-08-09T10:00:00.000Z' },
  ],
  seasons: [{ id: 'season-snapshot-1', season_key: '2026-s1', title: 'Mechi 2026 Season One', game: 'efootball', current_rating: 1430, peak_rating: 1505, matches: 18, wins: 13, losses: 3, draws: 2, tournament_entries: 2, tournament_wins: 1, podiums: 2, starts_at: '2026-01-01T00:00:00.000Z', ends_at: '2026-04-30T23:59:59.000Z' }],
  matches: Array.from({ length: 12 }, (_, index) => ({ id: `match-${index}`, game: index % 2 ? 'codm' : 'efootball', platform: index % 2 ? 'mobile' : 'playstation', opponent_id: `opponent-${index}`, opponent_username: `rival_${index + 1}`, result: index % 4 === 3 ? 'loss' as const : 'win' as const, score: index % 2 ? '3-1' : '2-0', completed_at: `2026-08-${String(10 - Math.floor(index / 2)).padStart(2, '0')}T10:00:00.000Z`, tournament_id: index < 4 ? 'tournament-1' : null })),
  tournaments: [],
  teams: [{ id: 'team-1', name: 'Nairobi Titans', slug: 'nairobi-titans', avatar_url: null, role: 'captain', membership_status: 'active', joined_at: '2025-01-05T10:00:00.000Z', left_at: null }],
  events: Array.from({ length: 8 }, (_, index) => ({ id: `credential-${index}`, verification_token: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`, user_id: '00000000-0000-0000-0000-000000000001', username: 'mechi_champion', display_name: 'Mechi Champion', event_key: `event-${index}`, event_title: index < 4 ? 'PlayMechi Nairobi Open' : 'Mechi Community Finals', stamp_type: index % 3 === 0 ? 'placement' as const : index % 2 ? 'competed' as const : 'checked_in' as const, credential_state: 'active', game: index % 2 ? 'codm' : 'efootball', role_label: null, placement: index % 3 === 0 ? index + 1 : null, source_type: 'tournament_player', source_key: `source-${index}`, issued_by: null, issuer_username: null, issued_at: '2026-08-01T10:00:00.000Z', occurred_at: `2026-07-${String(index + 10).padStart(2, '0')}T10:00:00.000Z`, public_details: {}, media_url: null, media_consent: false, revoked_at: null })),
  cv_settings: { selected_games: [], include_events: true, include_teams: true, include_achievements: true, inquiry_enabled: true, inquiry_url: 'https://mechi.club/@mechi_champion', headline: 'Verified eFootball competitor, CODM player, and community captain.' },
};

await mkdir(new URL('../output/pdf/', import.meta.url), { recursive: true });
await writeFile(new URL('../output/pdf/mechi-v5-gamer-cv-phase4-fixture.pdf', import.meta.url), buildGamerCvPdf(resume));
