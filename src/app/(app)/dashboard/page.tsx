import { Component as BlogPosts } from '@/components/blog-posts';
import { getOnlineTournamentArenaHref } from '@/lib/online-tournament-ops';

const dashboardPosts = [
  {
    id: 1,
    title: 'Playmechi Launch starts 8 May',
    category: 'upcoming tournament',
    description: 'PUBG Mobile, CODM, and eFootball go live across three nights at 8:00 PM EAT.',
    imageUrl: '/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
    href: getOnlineTournamentArenaHref('pubgm'),
  },
  {
    id: 2,
    title: 'Upcoming Stream',
    category: 'PlayMechi live',
    description: 'Catch the next broadcast on YouTube at 8:00 PM EAT.',
    imageUrl: '/dashboard-promos/playmechi-upcoming-stream.jpg',
    href: '/streams',
  },
  {
    id: 3,
    title: 'Socials and community drops',
    category: 'socials',
    description: 'Post your highlights, invite the squad, and keep the PlayMechi timeline loud.',
    imageUrl: '/dashboard-promos/playmechi-socials-community.jpg',
    href: '/share',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-start overflow-hidden px-3 pb-8 pt-12 sm:px-5 sm:pt-14 md:items-center md:pt-16 lg:px-7 lg:pt-20">
      <BlogPosts
        backgroundLabel="MECHI"
        backgroundPosition="left"
        posts={dashboardPosts}
        className="my-0 w-full max-w-7xl py-0"
      />
    </div>
  );
}
