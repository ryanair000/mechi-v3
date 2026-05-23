import Link from 'next/link';
import {
  CalendarClock,
  MonitorPlay,
  RadioTower,
  Smartphone,
  Trophy,
  Users,
} from 'lucide-react';
import {
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_STREAMER,
} from '@/lib/online-tournament';
import {
  WEEKEND_CUP_DASHBOARD_PATH,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';
import { FeedPost, type FeedPostProps } from '@/components/ui/feed-post';

const PLAYMECHI_FEED_POSTS: FeedPostProps[] = [
  {
    author: 'PlayMechi Desk',
    channel: 'Launch week',
    publishedAt: 'Pinned for this week',
    title: `${WEEKEND_CUP_TITLE} is open.`,
    body:
      `Register early, lock your Free Fire slot, and keep your squad ready for ${WEEKEND_CUP_EVENT_DATES}.\n\nFree Fire is confirmed for the Mobile Games Cup, so players can register now without waiting on voting.`,
    imageSrc: '/images/weekendcup/season-1-promo.png',
    imageAlt: 'PlayMechi Weekend Cup Season 1 poster',
    primaryAction: {
      href: WEEKEND_CUP_REGISTRATION_PATH,
      label: 'Register for Weekend Cup',
    },
    secondaryAction: {
      href: WEEKEND_CUP_DASHBOARD_PATH,
      label: 'Tournament desk',
      variant: 'outline',
    },
    metrics: [
      { icon: CalendarClock, label: 'Dates', value: WEEKEND_CUP_EVENT_DATES },
      { icon: Trophy, label: 'Prize pool', value: WEEKEND_CUP_PRIZE_POOL_LABEL },
      { icon: Users, label: 'Format', value: 'PUBGM, CODM, eFootball, Free Fire' },
    ],
    tags: ['Official', 'Weekend Cup', 'Season 1'],
    pinned: true,
    priority: true,
  },
  {
    author: 'PlayMechi Live',
    channel: 'Broadcast',
    publishedAt: 'Tonight at 8PM EAT',
    title: 'Stream drops should be one tap away.',
    body:
      `Instagram, TikTok, and YouTube carry the show. Mechi keeps the bracket, lobby flow, and match desk clear so the stream never outruns the actual tournament state.\n\nOn Android, that means fewer taps before a player finds the right stream or the right desk.`,
    imageSrc: '/dashboard-promos/playmechi-upcoming-stream.jpg',
    imageAlt: 'PlayMechi stream promo artwork',
    primaryAction: {
      href: '/streams',
      label: 'Open stream links',
    },
    secondaryAction: {
      href: ONLINE_TOURNAMENT_ARENA_PATH,
      label: 'Open tournament desk',
      variant: 'ghost',
    },
    metrics: [
      { icon: MonitorPlay, label: 'Channels', value: 'Instagram, TikTok, YouTube' },
      { icon: RadioTower, label: 'Host', value: ONLINE_TOURNAMENT_STREAMER },
      { icon: CalendarClock, label: 'Window', value: ONLINE_TOURNAMENT_EVENT_DATES },
    ],
    tags: ['Live', 'Broadcast', 'PlayMechi'],
  },
  {
    author: 'PlayMechi Mobile',
    channel: 'Android lane',
    publishedAt: 'Build log',
    title: 'Android feedback is shaping the next release.',
    body:
      'This feed is tuned for phone-first scanning: bold media, short copy, and clean calls to action instead of story timers. When PlayMechi drops a post, the next move should feel obvious in one glance.',
    imageSrc: '/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
    imageAlt: 'PlayMechi mobile gaming artwork',
    primaryAction: {
      href: '/android-testers',
      label: 'Join Android testers',
    },
    secondaryAction: {
      href: '/blog#mobile-beta',
      label: 'Read platform notes',
      variant: 'outline',
    },
    metrics: [
      { icon: Smartphone, label: 'Focus', value: 'Real Android devices' },
      { icon: Users, label: 'Goal', value: 'Faster player flows' },
      { icon: CalendarClock, label: 'Review loop', value: 'Continuous' },
    ],
    tags: ['Android', 'Beta', 'UX'],
  },
  {
    author: 'PlayMechi Community',
    channel: 'Social lane',
    publishedAt: 'Always on',
    title: 'Keep the squad loud between match nights.',
    body:
      'Share the next tournament, send clean invite links, and keep community momentum high between brackets. This feed can carry the official spark while socials do the wider amplification.',
    imageSrc: '/dashboard-promos/playmechi-socials-community.jpg',
    imageAlt: 'PlayMechi community and socials artwork',
    primaryAction: {
      href: '/socials',
      label: 'Open socials',
    },
    secondaryAction: {
      href: '/share',
      label: 'Open share tools',
      variant: 'ghost',
    },
    metrics: [
      { icon: Users, label: 'Audience', value: 'Squads and new players' },
      { icon: Trophy, label: 'Use case', value: 'Tournament promo' },
      { icon: MonitorPlay, label: 'Flow', value: 'Feed to socials' },
    ],
    tags: ['Community', 'Growth', 'Share'],
  },
];

export function PlayMechiFeedPage() {
  return (
    <div className="page-container mx-auto max-w-3xl space-y-4 pt-4 sm:space-y-5 sm:pt-5">
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(50,224,196,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,107,107,0.16),transparent_32%)]" />
        <div className="relative">
          <span className="brand-kicker">Feed</span>
          <h1 className="mt-4 max-w-2xl text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-[2.8rem]">
            PlayMechi on phone should feel like a feed, not a maze.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            Official posts only. No profile circles. No auto-progress story line. Just bold update
            cards that make the next action obvious for Android players.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="brand-chip">Android-first</span>
            <span className="brand-chip">Official desk posts</span>
            <span className="brand-chip">Main home feed</span>
            <span className="brand-chip">PlayMechi updates</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-primary">
              Join PlayMechi
            </Link>
            <Link href="/streams" className="btn-ghost">
              Watch live links
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-4 sm:space-y-5">
        {PLAYMECHI_FEED_POSTS.map((post) => (
          <FeedPost key={`${post.author}-${post.title}`} {...post} />
        ))}
      </div>
    </div>
  );
}
