'use client';

import { useCallback, useEffect, useState } from 'react';
import FooterSection from '@/components/footer';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { CtaCard } from '@/components/ui/cta-card';
import { Faq5 } from '@/components/ui/faq-5';
import { Features } from '@/components/ui/features-4';
import { GlassBlogCard } from '@/components/ui/glass-blog-card-shadcnui';
import { Hero1 } from '@/components/ui/hero-with-text-and-two-button';
import { TestimonialCarousel } from '@/components/ui/profile-card-testimonial-carousel';
import { getGameImage } from '@/lib/config';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_STREAM_CHANNEL,
  ONLINE_TOURNAMENT_STREAM_DELAY_MINUTES,
  ONLINE_TOURNAMENT_STREAMER,
  ONLINE_TOURNAMENT_TOTAL_SLOTS,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';

type GameRegistrationCount = {
  registered: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
};

type RegistrationSummary = {
  games: Record<OnlineTournamentGameKey, GameRegistrationCount>;
  registrations: unknown[];
};

const API_PATH = '/api/events/mechi-online-gaming-tournament/register';
const TOURNAMENT_NAV_ITEMS = [
  { href: '#prizes', label: 'PRIZES' },
  { href: '#rules', label: 'RULES' },
  { href: '#stream', label: 'STREAM' },
  { href: '#team', label: 'TEAM' },
];

function getFallbackSummary(): RegistrationSummary {
  return {
    games: ONLINE_TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        counts[game.game] = {
          registered: 0,
          slots: game.slots,
          spotsLeft: game.slots,
          full: false,
        };
        return counts;
      },
      {} as Record<OnlineTournamentGameKey, GameRegistrationCount>
    ),
    registrations: [],
  };
}

export function OnlineTournamentClient() {
  const [summary, setSummary] = useState<RegistrationSummary>(() => getFallbackSummary());
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as RegistrationSummary & { error?: string };

      if (!res.ok) {
        setSummaryError(data.error ?? 'Could not load registration state');
        return;
      }

      setSummary(data);
      setSummaryError(null);
    } catch {
      setSummaryError('Could not load registration state');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <HomeFloatingHeader
        navItems={TOURNAMENT_NAV_ITEMS}
        signInHref={`/login?next=${ONLINE_TOURNAMENT_REGISTRATION_PATH}`}
        joinHref={ONLINE_TOURNAMENT_REGISTRATION_PATH}
      />

      <main className="landing-shell pb-8 pt-3 sm:pb-10 sm:pt-5">
        <section>
          <Hero1
            badgeLabel={`Free entry | ${ONLINE_TOURNAMENT_TOTAL_SLOTS} slots | ${ONLINE_TOURNAMENT_EVENT_DATES}`}
            title="Pull up. Lock in. Win on Mechi."
            description="Free online tournament for PUBG Mobile, Call of Duty Mobile, and eFootball. Register on Mechi.club, show up at 8:00 PM, and fight for the KSh 6,000 cash prize pool plus game currency live on PlayMechi."
            secondaryLabel="See The Prizes"
            secondaryHref="#prizes"
            primaryLabel="Register Now!"
            primaryHref={ONLINE_TOURNAMENT_REGISTRATION_PATH}
          />
        </section>

        <section id="games" className="scroll-mt-24 pt-2 sm:pt-4">
          <div id="prizes" className="scroll-mt-24">
            <p className="section-title">Games and prizes</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {ONLINE_TOURNAMENT_GAMES.map((game) => (
                <GlassBlogCard
                  key={game.game}
                  title={game.label}
                  excerpt={`${game.format}. ${game.matchCount}. ${game.scoring}`}
                  image={getGameImage(game.game)}
                  date={game.dateLabel}
                  readTime={game.timeLabel}
                  tags={[
                    game.shortLabel,
                    summaryLoading || summaryError
                      ? `${game.slots} slots`
                      : `${summary.games[game.game]?.spotsLeft ?? game.slots} slots left`,
                  ]}
                  stats={[
                    { label: '1st place', value: game.firstPrize },
                    { label: '2nd place', value: game.secondPrize },
                    { label: '3rd place', value: game.thirdPrize },
                  ]}
                />
              ))}
            </div>
          </div>
        </section>

        <Features />

        <section id="stream" className="landing-section scroll-mt-24 border-t border-[var(--border-color)]">
          <CtaCard
            title="Stream"
            subtitle={`Watch it live on ${ONLINE_TOURNAMENT_STREAM_CHANNEL}.`}
            description={`${ONLINE_TOURNAMENT_STREAMER} handles the broadcast for all three nights. Pull up on YouTube at 8:00 PM EAT; PUBG Mobile and CODM run with a ${ONLINE_TOURNAMENT_STREAM_DELAY_MINUTES}-minute delay so the matches stay clean while the chat still catches the action.`}
            buttonText="Watch on YouTube"
            buttonHref="https://www.youtube.com/@playmechi"
            buttonTarget="_blank"
            imageSrc="/game-artwork/codm-header.webp"
            imageAlt="Call of Duty Mobile action artwork for the PlayMechi tournament stream"
            className="border-white/10 bg-[rgba(10,18,31,0.76)] text-[var(--text-primary)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md [&_h2]:text-[var(--text-primary)] [&_p]:leading-7 [&_p]:text-[var(--text-secondary)] [&>div:first-child]:border-b [&>div:first-child]:border-white/10 md:[&>div:first-child]:border-b-0 md:[&>div:first-child]:border-r"
          />
        </section>

        <section id="team" className="landing-section scroll-mt-24 border-t border-[var(--border-color)]">
          <div className="mb-8 max-w-3xl">
            <p className="section-title">Team</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
              The crew running the night.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Stream, match control, and tournament ops are covered by the people below.
            </p>
          </div>

          <TestimonialCarousel />
        </section>

        <Faq5 />
      </main>

      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
