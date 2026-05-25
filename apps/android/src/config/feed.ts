import { TOURNAMENT_REGISTER_URL } from './tournament';

export type FeedMetric = {
  icon: 'calendar-outline' | 'trophy-outline' | 'people-outline' | 'radio-outline' | 'phone-portrait-outline';
  label: string;
  value: string;
};

export type FeedAction = {
  label: string;
  kind: 'internal' | 'external';
  href: string;
};

export type FeedPost = {
  id: string;
  author: string;
  channel: string;
  publishedAt: string;
  title: string;
  body: string;
  imageUrl: string;
  tags: string[];
  pinned?: boolean;
  metrics: FeedMetric[];
  primaryAction?: FeedAction;
  secondaryAction?: FeedAction;
};

export const PLAYMECHI_FEED_POSTS: FeedPost[] = [
  {
    id: 'weekend-cup-season-1',
    author: 'PlayMechi Desk',
    channel: 'Launch week',
    publishedAt: 'Pinned for this week',
    title: 'Weekend Cup Season 1 is live.',
    body:
      'Lock your slot early, keep your squad ready, and watch the Arena desk for lobby drops. Official updates land here first.',
    imageUrl: 'https://mechi.club/images/weekendcup/season-1-promo.png',
    tags: ['Official', 'Weekend Cup', 'Season 1'],
    pinned: true,
    metrics: [
      { icon: 'calendar-outline', label: 'Dates', value: '29-31 May 2026' },
      { icon: 'trophy-outline', label: 'Prize pool', value: 'KSh 6,000' },
      { icon: 'people-outline', label: 'Format', value: 'PUBGM, CODM, eFootball' },
    ],
    primaryAction: {
      label: 'Register now',
      kind: 'external',
      href: TOURNAMENT_REGISTER_URL,
    },
    secondaryAction: {
      label: 'Open Arena',
      kind: 'internal',
      href: '/(tabs)/arena',
    },
  },
  {
    id: 'stream-lane',
    author: 'PlayMechi Live',
    channel: 'Broadcast',
    publishedAt: 'Tonight at 8PM EAT',
    title: 'Streams stay close to the action.',
    body:
      'Watch the show on social, then use PlayMechi for the real match state: rooms, brackets, and verified updates.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-upcoming-stream.jpg',
    tags: ['Live', 'Broadcast', 'PlayMechi'],
    metrics: [
      { icon: 'radio-outline', label: 'Channels', value: 'IG, TikTok, YouTube' },
      { icon: 'calendar-outline', label: 'Window', value: '8:00 PM EAT' },
      { icon: 'people-outline', label: 'Flow', value: 'Stream + Arena' },
    ],
    primaryAction: {
      label: 'Open Arena',
      kind: 'internal',
      href: '/(tabs)/arena',
    },
    secondaryAction: {
      label: 'Open Instagram',
      kind: 'external',
      href: 'https://www.instagram.com/playmechi/',
    },
  },
  {
    id: 'android-lane',
    author: 'PlayMechi Mobile',
    channel: 'Android lane',
    publishedAt: 'Build log',
    title: 'Android is your match-night pocket desk.',
    body:
      'Fast copy, bold media, and direct actions. Every post should tell you what matters and where to tap next.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
    tags: ['Android', 'Beta', 'UX'],
    metrics: [
      { icon: 'phone-portrait-outline', label: 'Focus', value: 'Real Android devices' },
      { icon: 'people-outline', label: 'Goal', value: 'Less confusion' },
      { icon: 'calendar-outline', label: 'Loop', value: 'Ship, test, improve' },
    ],
    primaryAction: {
      label: 'Open community',
      kind: 'internal',
      href: '/(tabs)/community',
    },
    secondaryAction: {
      label: 'Android testers',
      kind: 'external',
      href: 'https://mechi.club/android-testers',
    },
  },
  {
    id: 'community-lane',
    author: 'PlayMechi Community',
    channel: 'Social lane',
    publishedAt: 'Always on',
    title: 'Keep the squad active between match nights.',
    body:
      'Use Community for callouts, match talk, reminders, and clean energy. Bring the hype, keep it respectful.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-socials-community.jpg',
    tags: ['Community', 'Growth', 'Share'],
    metrics: [
      { icon: 'people-outline', label: 'Audience', value: 'Squads and new players' },
      { icon: 'trophy-outline', label: 'Use case', value: 'Match callouts' },
      { icon: 'radio-outline', label: 'Flow', value: 'Feed to chat' },
    ],
    primaryAction: {
      label: 'Enter community',
      kind: 'internal',
      href: '/(tabs)/community',
    },
    secondaryAction: {
      label: 'Open YouTube',
      kind: 'external',
      href: 'https://www.youtube.com/@playmechi',
    },
  },
];
