import { Component as BlogPosts } from '@/components/blog-posts';

const dashboardPosts = [
  {
    id: 1,
    title: 'Friday FC26 cash ladder is open',
    category: 'tournaments',
    imageUrl: '/game-artwork/fc26-header.svg',
    href: '/tournaments',
    views: 2180,
    readTime: 3,
    rating: 5,
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
    <div className="min-h-screen overflow-hidden px-3 pb-8 pt-4 sm:px-5 lg:px-7 lg:pt-8">
      <BlogPosts
        title="Mechi playbook"
        description="Fresh routes into tournaments, ranked queues, and rewards."
        backgroundLabel="MECHI"
        backgroundPosition="left"
        posts={dashboardPosts}
        className="my-0 max-w-7xl py-6 lg:py-10"
      />
    </div>
  );
}
