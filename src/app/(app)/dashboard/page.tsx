import { Component as BlogPosts } from '@/components/blog-posts';

const dashboardPosts = [
  {
    id: 1,
    title: 'Playmechi Launch starts 8 May',
    category: 'upcoming tournament',
    description: 'PUBG Mobile, CODM, and eFootball go live across three nights at 8:00 PM EAT.',
    imageUrl: '/game-artwork/pubgm-header.svg',
    href: '/tournaments#playmechi-pubgm',
  },
  {
    id: 2,
    title: 'Efootball Mobile queue briefing',
    category: 'matchmaking',
    imageUrl: '/game-artwork/efootball_mobile-header.svg',
    href: '/queue?game=efootball_mobile',
    views: 1456,
    readTime: 2,
    rating: 4,
  },
  {
    id: 3,
    title: 'Reward drops and redeemable missions',
    category: 'rewards',
    imageUrl: '/game-artwork/codm-header.svg',
    href: '/rewards',
    views: 987,
    readTime: 4,
    rating: 4,
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
