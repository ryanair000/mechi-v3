'use client';

import { useCallback, useEffect, useState } from 'react';
import FooterSection from '@/components/footer';
import { useAuth } from '@/components/AuthProvider';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { CtaCard } from '@/components/ui/cta-card';
import { Faq5 } from '@/components/ui/faq-5';
import { Features } from '@/components/ui/features-4';
import { GlassBlogCard } from '@/components/ui/glass-blog-card-shadcnui';
import { Hero1 } from '@/components/ui/hero-with-text-and-two-button';
import { TestimonialCarousel } from '@/components/ui/profile-card-testimonial-carousel';
import { TournamentFacts } from '@/components/TournamentFacts';
import { getGameImage } from '@/lib/config';
import { getRegisterPath } from '@/lib/navigation';
import { getOnlineTournamentGameFacts } from '@/lib/tournament-facts';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_STREAMER,
  ONLINE_TOURNAMENT_TOTAL_SLOTS,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
  isOnlineTournamentRegistrationClosed,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';

type GameRegistrationCount = {
  registered: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
  checkedIn: number;
  checkInCap: number;
  checkInSpotsLeft: number;
  checkInFull: boolean;
};

type RegistrationSummary = {
  games: Record<OnlineTournamentGameKey, GameRegistrationCount>;
  registrations: unknown[];
};

const API_PATH = '/api/events/mechi-online-gaming-tournament/register';
const TOURNAMENT_SIGN_UP_PATH = getRegisterPath({
  next: ONLINE_TOURNAMENT_REGISTRATION_PATH,
});
function getFallbackSummary(): RegistrationSummary {
  return {
    games: ONLINE_TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        const registrationClosed = isOnlineTournamentRegistrationClosed(game);
        counts[game.game] = {
          registered: 0,
          slots: game.slots,
          spotsLeft: registrationClosed ? 0 : game.slots,
          full: registrationClosed,
          checkedIn: 0,
          checkInCap: game.checkInCap,
          checkInSpotsLeft: game.checkInCap,
          checkInFull: false,
        };
        return counts;
      },
      {} as Record<OnlineTournamentGameKey, GameRegistrationCount>
    ),
    registrations: [],
  };
}

export function OnlineTournamentClient() {
  const { user } = useAuth();
  const { locale } = useRegionalSettings();
  const [summary, setSummary] = useState<RegistrationSummary>(() => getFallbackSummary());
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const tournamentRegistrationHref = user
    ? ONLINE_TOURNAMENT_REGISTRATION_PATH
    : TOURNAMENT_SIGN_UP_PATH;
  const isSwahili = locale === 'sw-TZ';

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
      <PlayMechiHomeHeader />

      <main className="landing-shell pb-8 pt-3 sm:pb-10 sm:pt-5">
        <section>
          <Hero1
            badgeLabel={`Free entry | ${ONLINE_TOURNAMENT_TOTAL_SLOTS} registrations max | ${ONLINE_TOURNAMENT_EVENT_DATES}`}
            title={isSwahili ? 'Njoo. Jifunge. Shinda kwenye Mechi.' : 'Pull up. Lock in. Win on Mechi.'}
            description={
              isSwahili
                ? 'Tournament ya bure ya mtandaoni kwa PUBG Mobile, Call of Duty Mobile, na eFootball. Kila mchezo unakubali usajili hadi 200, huku check-in za siku ya mechi zikibaki PUBG 100, CODM 100, na eFootball 16. Jisajili kwenye Mechi.club, fika saa 2:00 usiku, na pigania prize pool ya KSh 6,000 pamoja na game currency live kwenye PlayMechi.'
                : 'Free online tournament for PUBG Mobile, Call of Duty Mobile, and eFootball. Each game accepts up to 200 registrations, while match-day check-in caps stay locked at PUBG 100, CODM 100, and eFootball 16. Register on Mechi.club, show up at 8:00 PM, and fight for the KSh 6,000 cash prize pool plus game currency live on PlayMechi.'
            }
            secondaryLabel={isSwahili ? 'Ona Zawadi' : 'See The Prizes'}
            secondaryHref="#prizes"
            primaryLabel={isSwahili ? 'Jisajili Sasa!' : 'Register Now!'}
            primaryHref={tournamentRegistrationHref}
          />
        </section>

        <section id="games" className="scroll-mt-24 pt-2 sm:pt-4">
          <div id="prizes" className="scroll-mt-24">
            <p className="section-title">{isSwahili ? 'Michezo na zawadi' : 'Games and prizes'}</p>
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
                      : isSwahili
                        ? `${summary.games[game.game]?.spotsLeft ?? game.slots} nafasi zimebaki`
                        : `${summary.games[game.game]?.spotsLeft ?? game.slots} slots left`,
                  ]}
                  stats={[
                    { label: isSwahili ? 'Nafasi ya 1' : '1st place', value: game.firstPrize },
                    { label: isSwahili ? 'Nafasi ya 2' : '2nd place', value: game.secondPrize },
                    { label: isSwahili ? 'Nafasi ya 3' : '3rd place', value: game.thirdPrize },
                  ]}
                />
              ))}
            </div>
            <div className="mt-6 grid gap-5">
              {ONLINE_TOURNAMENT_GAMES.map((game) => (
                <TournamentFacts
                  key={`${game.game}-facts`}
                  title={`${game.label} tournament facts`}
                  facts={getOnlineTournamentGameFacts(game)}
                />
              ))}
            </div>
          </div>
        </section>

        <Features />

        <section id="stream" className="landing-section scroll-mt-24 border-t border-[var(--border-color)]">
          <CtaCard
            title={isSwahili ? 'Stream' : 'Stream'}
            subtitle={
              isSwahili
                ? 'Tazama live kwenye Instagram, TikTok, na YouTube.'
                : 'Watch it live on Instagram, TikTok, and YouTube.'
            }
            description={
              isSwahili
                ? `${ONLINE_TOURNAMENT_STREAMER} anasimamia broadcast kwa nights zote tatu. Njoo kwenye social saa 2:00 usiku EAT, leta nguvu za chat, na tazama PUBG Mobile, CODM, na eFootball live.`
                : `${ONLINE_TOURNAMENT_STREAMER} handles the broadcast for all three nights. Pull up on social at 8:00 PM EAT, bring the chat energy, and watch PUBG Mobile, CODM, and eFootball go off live.`
            }
            buttonText={isSwahili ? 'Fungua channel ya YouTube' : 'Open YouTube channel'}
            buttonHref={ONLINE_TOURNAMENT_YOUTUBE_URL}
            buttonTarget="_blank"
            imageSrc="/game-artwork/codm-header.webp"
            imageAlt={
              isSwahili
                ? 'Picha ya Call of Duty Mobile kwa stream ya tournament ya PlayMechi'
                : 'Call of Duty Mobile action artwork for the PlayMechi tournament stream'
            }
            className="border-white/10 bg-[rgba(10,18,31,0.76)] text-[var(--text-primary)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md [&_h2]:text-[var(--text-primary)] [&_p]:leading-7 [&_p]:text-[var(--text-secondary)] [&>div:first-child]:border-b [&>div:first-child]:border-white/10 md:[&>div:first-child]:border-b-0 md:[&>div:first-child]:border-r"
          />
        </section>

        <section id="team" className="landing-section scroll-mt-24 border-t border-[var(--border-color)]">
          <div className="mb-8 max-w-3xl">
            <p className="section-title">{isSwahili ? 'Timu' : 'Team'}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
              {isSwahili ? 'Kikosi kinachosimamia usiku.' : 'The crew running the night.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {isSwahili
                ? 'Stream, udhibiti wa mechi, na ops za tournament zinasimamiwa na watu waliopo hapa chini.'
                : 'Stream, match control, and tournament ops are covered by the people below.'}
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
