import { Component as BlogPosts } from '@/components/blog-posts';
import { ONLINE_TOURNAMENT_YOUTUBE_URL } from '@/lib/online-tournament';
import { getOnlineTournamentArenaHref } from '@/lib/online-tournament-ops';

const dashboardPosts = [
  {
    id: 1,
    title: 'Playmechi Launch starts 8 May',
    category: 'upcoming tournament',
    description: 'PUBG Mobile, CODM, and eFootball go live across three nights at 8:00 PM EAT.',
    imageUrl: '/game-artwork/pubgm-header.svg',
    href: getOnlineTournamentArenaHref('pubgm'),
  },
  {
    id: 2,
    title: 'Upcoming Stream',
    category: 'PlayMechi live',
    description: 'Catch the next broadcast on YouTube at 8:00 PM EAT.',
    imageUrl: '/game-artwork/efootball_mobile-header.svg',
    href: ONLINE_TOURNAMENT_YOUTUBE_URL,
  },
  {
    id: 3,
    title: 'Socials and community drops',
    category: 'socials',
    description: 'Post your highlights, invite the squad, and keep the PlayMechi timeline loud.',
    imageUrl: '/game-artwork/codm-header.svg',
    href: '/share',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen overflow-hidden px-3 pb-8 pt-0 sm:px-5 lg:px-7">
      <BlogPosts
        backgroundLabel="MECHI"
        backgroundPosition="left"
        posts={dashboardPosts}
        className="my-0 max-w-7xl py-0"
      />
    </div>
  );
}
