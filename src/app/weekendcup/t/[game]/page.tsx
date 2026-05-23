import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import FooterSection from '@/components/footer';
import { TournamentFacts } from '@/components/TournamentFacts';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { getGameImage, getGameLogoImage } from '@/lib/config';
import {
  WEEKEND_CUP_GAME_BY_KEY,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PENDING_PAYMENT_HELP_COPY,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_PROMO_IMAGE,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_TITLE,
  isWeekendCupGame,
  isWeekendCupRegisterableGame,
} from '@/lib/weekend-cup';
import { getWeekendCupGameFacts } from '@/lib/tournament-facts';

type WeekendCupDetailPageProps = {
  params: Promise<{ game: string }>;
};

function getWeekendCupDetailImage(game: string) {
  if (game === 'mystery') {
    return WEEKEND_CUP_PROMO_IMAGE;
  }

  return getGameImage(game as keyof typeof WEEKEND_CUP_GAME_BY_KEY) ?? WEEKEND_CUP_PROMO_IMAGE;
}

function getWeekendCupDetailCopy(game: keyof typeof WEEKEND_CUP_GAME_BY_KEY) {
  if (game === 'mystery') {
    return {
      kicker: 'Free Fire confirmed',
      description:
        'Mobile Games Cup voting is closed. Free Fire is confirmed for Season 1 and registration is open.',
      primaryHref: `${WEEKEND_CUP_REGISTRATION_PATH}?game=freefire`,
      primaryLabel: 'Register for Weekend Cup',
    };
  }

  return {
    kicker: 'Season 1 bracket',
    description:
      'Lock your player tag, clear payment, and show up ready on match day.',
    primaryHref: `${WEEKEND_CUP_REGISTRATION_PATH}?game=${game}`,
    primaryLabel: 'Register for Weekend Cup',
  };
}

export async function generateStaticParams() {
  return WEEKEND_CUP_GAMES.map((game) => ({ game: game.game }));
}

export async function generateMetadata({
  params,
}: WeekendCupDetailPageProps): Promise<Metadata> {
  const { game } = await params;
  if (game === 'pubg') {
    return {
      title: `PUBG Mobile | ${WEEKEND_CUP_TITLE}`,
      alternates: {
        canonical: '/weekendcup/t/pubgm',
      },
    };
  }

  if (!isWeekendCupGame(game)) {
    return {
      title: `Tournament | ${WEEKEND_CUP_TITLE}`,
    };
  }

  const config = WEEKEND_CUP_GAME_BY_KEY[game];
  return {
    title: `${config.label} | ${WEEKEND_CUP_TITLE}`,
    description: `${config.label} on ${config.dateLabel} at ${config.timeLabel}. ${config.format}`,
    alternates: {
      canonical: `/weekendcup/t/${game}`,
    },
  };
}

export default async function WeekendCupGameDetailPage({
  params,
}: WeekendCupDetailPageProps) {
  const { game } = await params;
  if (game === 'pubg') {
    permanentRedirect('/weekendcup/t/pubgm');
  }

  if (!isWeekendCupGame(game)) {
    notFound();
  }

  const config = WEEKEND_CUP_GAME_BY_KEY[game];
  const detailCopy = getWeekendCupDetailCopy(game);
  const detailImage = getWeekendCupDetailImage(game);
  const gameLogo = getGameLogoImage(game);
  const paymentLine = isWeekendCupRegisterableGame(game) ? 'Entry from KSh 50' : 'Community vote';

  return (
    <div className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.08),transparent_32%),linear-gradient(180deg,#07111e_0%,#050b13_100%)]">
      <WeekendCupHeader />

      <main className="page-container max-w-5xl space-y-6 pb-10 pt-5">
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.76)] shadow-[var(--shadow-soft)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative min-h-[300px]">
              <Image
                src={detailImage}
                alt={`${config.label} artwork`}
                fill
                priority
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/28 to-transparent" />
            </div>

            <div className="flex flex-col justify-between p-5 sm:p-6">
              <div className="space-y-4">
                <p className="section-title">{detailCopy.kicker}</p>
                <div>
                  {gameLogo ? (
                    <>
                      <h1 className="sr-only">{config.label}</h1>
                      <div className="relative h-16 w-full max-w-[360px] sm:h-20">
                        <Image
                          src={gameLogo}
                          alt={`${config.label} logo`}
                          fill
                          sizes="(min-width: 640px) 360px, 86vw"
                          className="object-contain object-left"
                        />
                      </div>
                    </>
                  ) : (
                    <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[0.96] text-[var(--text-primary)]">
                      {config.label}
                    </h1>
                  )}
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[0.98rem]">
                    {detailCopy.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="brand-chip !rounded-[var(--radius-control)] px-3 py-1">
                    {config.dateLabel}
                  </span>
                  <span className="brand-chip !rounded-[var(--radius-control)] px-3 py-1">
                    {config.timeLabel}
                  </span>
                  <span className="brand-chip !rounded-[var(--radius-control)] px-3 py-1">
                    {paymentLine}
                  </span>
                  <span className="brand-chip !rounded-[var(--radius-control)] px-3 py-1">
                    {WEEKEND_CUP_PRIZE_POOL_LABEL}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Format
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {config.format}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Match flow
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {config.matchCount}. {config.scoring}
                    </p>
                  </div>
                </div>

                <TournamentFacts
                  title={`${config.label} tournament facts`}
                  facts={getWeekendCupGameFacts(config)}
                />

                {isWeekendCupRegisterableGame(game) ? (
                  <div className="rounded-[var(--radius-panel)] border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
                      Payment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {WEEKEND_CUP_PENDING_PAYMENT_HELP_COPY}
                    </p>
                  </div>
                ) : null}
                {isWeekendCupRegisterableGame(game) ? (
                  <div className="rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      What happens after I pay?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Paystack confirms the transaction, then your Weekend Cup dashboard shows the
                      slot as paid and tells you when to check in for match day.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={detailCopy.primaryHref} className="btn-primary !rounded-[var(--radius-control)]">
                  {detailCopy.primaryLabel}
                </Link>
                <Link href={WEEKEND_CUP_PUBLIC_PATH} className="btn-outline !rounded-[var(--radius-control)]">
                  Back to Weekend Cup
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection className="!pt-4 md:!pt-8" />
    </div>
  );
}
