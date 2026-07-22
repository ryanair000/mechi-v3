import type { Metadata } from 'next';
import Script from 'next/script';
import { CreatorStudio, type CreatorStudioData } from '@/components/dashboard/CreatorStudio';
import { PlayMechiWorkspaceShell } from '@/components/dashboard/PlayMechiWorkspaceShell';

export const metadata: Metadata = { title: 'Creator Studio Preview | PlayMechi', robots: { index: false, follow: false } };

const demoData: CreatorStudioData = {
  creator: { id: 'creator-demo', display_name: 'Amani Plays', slug: 'amani-plays', status: 'active', availability: 'available', creator_types: ['streamer', 'commentator'], games: ['efootball', 'fc26'], platform_links: {} },
  summary: { published_content: 7, total_views: 28400, peak_live_viewers: 386, upcoming_coverage: 2, active_tournaments: 1 },
  content: [
    { id: 'content-1', title: 'Community Cup Final Highlights', platform: 'youtube', content_type: 'video', external_url: '#', views: 12600 },
    { id: 'content-2', title: 'How to Defend in eFootball', platform: 'tiktok', content_type: 'clip', external_url: '#', views: 8900 },
    { id: 'content-3', title: 'Friday FC Showdown Replay', platform: 'twitch', content_type: 'stream', external_url: '#', views: 6900 },
  ],
  coverage: [
    { id: 'coverage-1', title: 'PlayMechi Community Cup Final', assignment_type: 'commentary', status: 'accepted', scheduled_for: '2026-07-20T17:00:00Z' },
    { id: 'coverage-2', title: 'East Africa FC Showcase', assignment_type: 'highlights', status: 'invited', scheduled_for: '2026-07-26T15:00:00Z' },
  ],
  streams: [{ id: 'stream-1', title: 'Friday FC Showdown', status: 'ended', viewer_count: 386, created_at: '2026-07-12T18:00:00Z' }],
  tournaments: [{ id: 'tournament-1', slug: 'amani-community-lobby', title: 'Amani Community Lobby', game: 'efootball', status: 'open', scheduled_for: '2026-07-24T18:00:00Z' }],
};

export default function CreatorStudioPreviewPage() {
  return <><Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" /><PlayMechiWorkspaceShell workspaceOverride="creator"><CreatorStudio section="overview" initialData={demoData} /></PlayMechiWorkspaceShell></>;
}
