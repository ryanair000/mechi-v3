import type { Metadata } from 'next';
import Script from 'next/script';
import { PlayMechiWorkspaceShell } from '@/components/dashboard/PlayMechiWorkspaceShell';
import { PlayerDashboard, type PlayerDashboardData } from '@/components/dashboard/PlayerDashboard';

export const metadata: Metadata = { title: 'Player Dashboard Preview | PlayMechi', robots: { index: false, follow: false } };

const demoData: PlayerDashboardData = {
  profile: { username: 'Amani', selected_games: ['efootball'], level: 12, xp: 1264, win_streak: 3, reward_points_available: 840, rating_efootball: 1482, wins_efootball: 28, losses_efootball: 14 },
  unread_notifications: 3,
  partial: false,
  profile_setup: { complete: true, selected_game_count: 1, configured_game_count: 1, blocker: null },
  incoming_challenges: [],
  one_v_one_summary: { incoming_count: 0, sent_count: 1 },
  teams: [],
  team_summary: { membership_count: 0, invitation_count: 0, primary_team: null },
  next_action: { kind: 'upcoming_tournament', eyebrow: 'Next up', title: 'Your tournament starts soon', description: 'Open the event page and check your start time.', owner: 'You', href: '/t/playmechi-community-cup', label: 'View tournament' },
  today: [
    { id: 'tournament:cup-1', kind: 'upcoming_tournament', title: 'PlayMechi Community Cup', detail: 'eFootball · 20 Jul 2026, 8:00 PM EAT', href: '/t/playmechi-community-cup', action_label: 'View' },
  ],
  matches: [
    { id: 'demo-1', game: 'efootball', result: 'win', rating_change: 18, created_at: '2026-07-16T18:00:00Z', opponent: { username: 'KiberaKings' } },
    { id: 'demo-2', game: 'fc26', result: 'loss', rating_change: -11, created_at: '2026-07-14T19:00:00Z', opponent: { username: 'NairobiNova' } },
    { id: 'demo-3', game: 'efootball', result: 'win', rating_change: 15, created_at: '2026-07-12T17:30:00Z', opponent: { username: 'MombasaElite' } },
  ],
  tournaments: [
    { id: 'registration-1', payment_status: 'free', check_in_status: 'registered', tournament: { id: 'cup-1', slug: 'playmechi-community-cup', title: 'PlayMechi Community Cup', game: 'efootball', status: 'open', size: 16, scheduled_for: '2026-07-20T17:00:00Z' } },
    { id: 'registration-2', payment_status: 'free', check_in_status: 'checked_in', tournament: { id: 'cup-2', slug: 'friday-fc-showdown', title: 'Friday FC Showdown', game: 'fc26', status: 'active', size: 8, scheduled_for: '2026-07-18T18:30:00Z' } },
  ],
  recommended: [
    { id: 'rec-1', slug: 'efootball-rising-stars', title: 'eFootball Rising Stars', game: 'efootball', status: 'open', size: 16, player_count: 11, entry_fee: 0, scheduled_for: '2026-07-23T18:00:00Z' },
    { id: 'rec-2', slug: 'tekken-8-weekender', title: 'Tekken 8 Weekender', game: 'tekken8', status: 'open', size: 8, player_count: 5, entry_fee: 0, scheduled_for: '2026-07-25T14:00:00Z' },
    { id: 'rec-3', slug: 'mortal-kombat-night', title: 'Mortal Kombat Night', game: 'mk11', status: 'open', size: 16, player_count: 8, entry_fee: 0, scheduled_for: '2026-07-27T17:30:00Z' },
  ],
};

export default function PlayerDashboardPreviewPage() {
  return <><Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" /><PlayMechiWorkspaceShell workspaceOverride="player"><PlayerDashboard initialData={demoData} /></PlayMechiWorkspaceShell></>;
}
