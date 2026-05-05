import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Gamepad2,
  Radio,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import FooterSection from '@/components/footer';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { ONLINE_TOURNAMENT_REGISTRATION_PATH } from '@/lib/online-tournament';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blog | Mechi.club',
  description:
    'Tournament notes, player guides, platform updates, and PlayMechi broadcast stories from the Mechi team.',
};

const BLOG_NAV_ITEMS = [
  { href: '/', label: 'TOURNAMENTS' },
  { href: '/blog', label: 'BLOG' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '/platform', label: 'PLATFORM' },
  { href: '/pricing', label: 'PRICING' },
];

const FEATURED_POST = {
  slug: 'playmechi-launch-week',
  title: 'PlayMechi launch week: what players should expect',
  dek: 'A practical field note for the first free online tournament across PUBG Mobile, Call of Duty Mobile, and eFootball.',
  category: 'Tournament desk',
  date: 'May 2026',
  readTime: '5 min read',
  image: '/game-artwork/codm-header.webp',
};

const POSTS = [
  FEATURED_POST,
  {
    slug: 'clean-lobbies',
    title: 'How clean lobbies make casual nights feel competitive',
    dek: 'Match rooms, score proof, and basic etiquette turn a loose group chat into a fair run.',
    category: 'Rules',
    date: 'Ops note',
    readTime: '4 min read',
    image: '/game-artwork/pubgm-header.webp',
  },
  {
    slug: 'mobile-beta',
    title: 'Why the Android tester lane matters before full launch',
    dek: 'The mobile beta gives Mechi real device feedback before wider tournaments, queues, and rewards scale up.',
    category: 'Android',
    date: 'Build log',
    readTime: '3 min read',
    image: '/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
  },
  {
    slug: 'stream-night',
    title: 'Building a better stream night for East African players',
    dek: 'A good broadcast needs pacing, clean brackets, fast result calls, and a chat that knows what is happening.',
    category: 'Stream',
    date: 'PlayMechi',
    readTime: '4 min read',
    image: '/dashboard-promos/playmechi-upcoming-stream.jpg',
  },
] as const;

const CATEGORIES = [
  { href: '#tournament-desk', label: 'Tournament desk', icon: Trophy },
  { href: '#rules-lab', label: 'Rules lab', icon: ShieldCheck },
  { href: '#platform-notes', label: 'Platform notes', icon: Gamepad2 },
  { href: '#broadcast-room', label: 'Broadcast room', icon: Radio },
];

const ARTICLE_SECTIONS = [
  {
    id: 'tournament-desk',
    slug: 'playmechi-launch-week',
    title: 'Tournament desk',
    label: 'PlayMechi launch week',
    icon: Trophy,
    image: '/game-artwork/efootball_mobile-header.webp',
    paragraphs: [
      'The launch tournament is built to be easy to enter and serious once the match starts. Players register on Mechi, join the right game night, and follow the posted format so the desk can keep the bracket moving without long pauses.',
      'PUBG Mobile and Call of Duty Mobile need quick room discipline: correct username, on-time check-in, no side deals, and score proof when asked. eFootball is more direct, but the same standard applies. If a result is disputed, clean screenshots and calm reporting beat noise every time.',
      'The prize pool is intentionally simple for launch week. It lets new players understand the stakes fast, gives the stream a clear story, and helps the ops team learn which parts of the flow need tightening before bigger events.',
    ],
  },
  {
    id: 'rules-lab',
    slug: 'clean-lobbies',
    title: 'Rules lab',
    label: 'Clean lobbies',
    icon: ShieldCheck,
    image: '/game-artwork/pubgm-header.webp',
    paragraphs: [
      'A clean lobby is not just a room code. It is a shared agreement that everyone is playing the same match, at the same time, under the same rules. That is what makes a casual night feel competitive without making it stressful.',
      'Mechi keeps the basics visible: match state, participants, chat context, and result reporting. The goal is to reduce the awkward back-and-forth that usually happens after a close game.',
      'The player standard is straightforward: show up, use your registered name, avoid unfair tools, keep proof, and respect the call when the tournament desk resolves a dispute.',
    ],
  },
  {
    id: 'platform-notes',
    slug: 'mobile-beta',
    title: 'Platform notes',
    label: 'Android tester lane',
    icon: Gamepad2,
    image: '/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
    paragraphs: [
      'Android testers help Mechi catch the real-world details that desktop previews miss: slower phones, uneven networks, small screens, notification timing, and account flows under pressure.',
      'The tester lane is also how the team learns which actions need to be faster on mobile. Joining a tournament, checking a match, reporting a score, and opening support all need to feel natural when a player is already focused on the game.',
      'That feedback loop matters because most competitive community play in the region already lives on phones. The app has to meet players where they actually play.',
    ],
  },
  {
    id: 'broadcast-room',
    slug: 'stream-night',
    title: 'Broadcast room',
    label: 'Stream night',
    icon: Radio,
    image: '/dashboard-promos/playmechi-upcoming-stream.jpg',
    paragraphs: [
      'A strong stream night gives viewers the same confidence as players. They should know which game is live, who is up next, what the prize story is, and why a match matters.',
      'The PlayMechi broadcast is designed around momentum: short waits, visible standings, quick calls from the desk, and enough context for a new viewer to join midstream without feeling lost.',
      'As more events run through Mechi, the blog will collect recaps, desk notes, player spotlights, and practical lessons from each broadcast.',
    ],
  },
];

function PostMeta({
  date,
  readTime,
  className,
}: {
  date: string;
  readTime: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]', className)}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays size={14} />
        {date}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 size={14} />
        {readTime}
      </span>
    </div>
  );
}

export default function BlogPage() {
  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <HomeFloatingHeader
        navItems={BLOG_NAV_ITEMS}
        joinHref={ONLINE_TOURNAMENT_REGISTRATION_PATH}
      />

      <main className="landing-shell pb-8 pt-5 sm:pb-10 sm:pt-8">
        <section className="grid gap-6 pb-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.72fr)] lg:items-end lg:gap-10">
          <div className="max-w-3xl">
            <span className="brand-kicker">
              <BookOpen size={16} />
              Mechi blog
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Field notes for players, hosts, and stream nights.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Tournament prep, platform updates, rule calls, and PlayMechi stories from the people building the competitive gaming layer for East Africa.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#latest" className="btn-primary">
                Latest posts
                <ArrowRight size={16} />
              </Link>
              <Link href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-ghost">
                Join tournament
              </Link>
            </div>
          </div>

          <Link
            href={`#${FEATURED_POST.slug}`}
            className="group relative min-h-[26rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)]"
          >
            <Image
              src={FEATURED_POST.image}
              alt="Call of Duty Mobile artwork for the PlayMechi launch week feature"
              fill
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/44 to-transparent" />
            <article className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <span className="brand-chip bg-black/35 text-white">
                Featured
              </span>
              <h2 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
                {FEATURED_POST.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/76">
                {FEATURED_POST.dek}
              </p>
              <PostMeta
                date={FEATURED_POST.date}
                readTime={FEATURED_POST.readTime}
                className="mt-4 text-white/72"
              />
            </article>
          </Link>
        </section>

        <section className="landing-section" aria-labelledby="blog-categories">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-title">Browse</p>
              <h2 id="blog-categories" className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                Follow the lanes that matter to your game night.
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className="group flex min-h-28 items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(50,224,196,0.2)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold text-[var(--text-primary)]">
                    {category.label}
                  </span>
                  <ArrowRight
                    size={17}
                    className="shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--text-primary)]"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section id="latest" className="landing-section scroll-mt-24" aria-labelledby="latest-posts">
          <div className="mb-7 max-w-3xl">
            <p className="section-title">Latest</p>
            <h2 id="latest-posts" className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              Fresh notes from the Mechi desk.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {POSTS.map((post, index) => (
              <Link
                key={post.slug}
                href={`#${post.slug}`}
                className={cn(
                  'group grid overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)] sm:grid-cols-[180px_minmax(0,1fr)]',
                  index === 0 && 'lg:col-span-2 lg:grid-cols-[minmax(300px,0.62fr)_minmax(0,1fr)]'
                )}
              >
                <div className="relative min-h-52 sm:min-h-full">
                  <Image
                    src={post.image}
                    alt={`${post.title} image`}
                    fill
                    sizes={index === 0 ? '(min-width: 1024px) 38vw, 100vw' : '(min-width: 640px) 180px, 100vw'}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <article className="flex min-h-64 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <span className="brand-chip">{post.category}</span>
                    <h3 className="mt-4 text-2xl font-black leading-tight text-[var(--text-primary)]">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                      {post.dek}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <PostMeta date={post.date} readTime={post.readTime} />
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-secondary-text)]">
                      Read note
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="landing-section scroll-mt-24" aria-labelledby="article-notes">
          <div className="mb-8 max-w-3xl">
            <p className="section-title">Read</p>
            <h2 id="article-notes" className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              Full notes.
            </h2>
          </div>

          <div className="grid gap-6">
            {ARTICLE_SECTIONS.map((article) => {
              const Icon = article.icon;

              return (
                <article
                  key={article.id}
                  id={article.id}
                  className="scroll-mt-28 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
                    <div className="relative min-h-72">
                      <Image
                        src={article.image}
                        alt={`${article.label} artwork`}
                        fill
                        sizes="(min-width: 1024px) 34vw, 100vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" />
                    </div>
                    <div className="p-5 sm:p-7 lg:p-8">
                      <span className="brand-kicker">
                        <Icon size={16} />
                        {article.title}
                      </span>
                      <h3 id={article.slug} className="mt-5 scroll-mt-28 text-3xl font-black text-[var(--text-primary)]">
                        {article.label}
                      </h3>
                      <div className="mt-5 space-y-4">
                        {article.paragraphs.map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
