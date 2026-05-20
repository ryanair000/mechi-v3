import { Component as BlogPosts } from '@/components/blog-posts';
import { PlayMechiFeedPage } from '@/components/PlayMechiFeedPage';
import {
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_PROMO_IMAGE,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

const dashboardPosts = [
  {
    id: 1,
    title: WEEKEND_CUP_TITLE,
    category: 'weekend cup live',
    description: `Free Fire is confirmed. Lock your Weekend Cup entry for ${WEEKEND_CUP_EVENT_DATES}.`,
    imageUrl: WEEKEND_CUP_PROMO_IMAGE,
    href: WEEKEND_CUP_PUBLIC_PATH,
  },
  {
    id: 2,
    title: 'Upcoming Stream',
    category: 'PlayMechi live',
    description: 'Catch the broadcast on Instagram, TikTok, and YouTube at 8:00 PM EAT.',
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
    <>
      <div className="lg:hidden">
        <PlayMechiFeedPage />
      </div>

      <div className="hidden lg:block">
        <div className="flex min-h-screen items-start overflow-hidden px-3 pb-8 pt-5 sm:px-5 sm:pt-6 md:pt-7 lg:px-7 lg:pt-8">
          <BlogPosts
            backgroundLabel="MECHI"
            backgroundPosition="left"
            posts={dashboardPosts}
            className="my-0 w-full max-w-7xl py-0"
          />
        </div>
      </div>
    </>
  );
}
