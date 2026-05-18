import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gamepad2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Trophy,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import FooterSection from '@/components/footer';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import {
  TZ_TOURNAMENT,
  getTanzaniaTournamentCallUrl,
  getTanzaniaTournamentWhatsappUrl,
} from '@/lib/tanzania-tournament';

function EventPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-black text-[var(--text-primary)]">
      {children}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
      <Icon size={18} className="text-[var(--accent-secondary-text)]" />
      <p className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function TanzaniaHomePage() {
  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <PlayMechiHomeHeader />
      <main className="landing-shell py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <EventPill>Tanzania</EventPill>
              <EventPill>{TZ_TOURNAMENT.game}</EventPill>
              <EventPill>{TZ_TOURNAMENT.entryFeeLabel}</EventPill>
            </div>
            <p className="brand-kicker mt-6 text-[var(--accent-secondary-text)]">
              Days Esports x Mechi.club
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-[var(--text-primary)] md:text-6xl">
              {TZ_TOURNAMENT.swahiliTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
              Tournament ya eFootball Mobile kwa wachezaji wa Tanzania. Jisajili kupitia Mechi,
              lipa {TZ_TOURNAMENT.entryFeeLabel} kwa Airtel Money, kisha tuma screenshot WhatsApp
              kwa Days Esports ili slot yako ithibitishwe.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary inline-flex items-center gap-2">
                Jisajili
                <ArrowRight size={16} />
              </Link>
              <a
                href={getTanzaniaTournamentWhatsappUrl('Habari Days Esports, nahitaji msaada kuhusu usajili wa Esports Day Tanzania.')}
                className="btn-outline inline-flex items-center gap-2"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-black">
              <div
                className="aspect-[4/3] bg-cover bg-center"
                style={{ backgroundImage: "url('/game-artwork/efootball_mobile-header.webp')" }}
              />
            </div>
            <div className="mt-5 flex items-center gap-3 text-[var(--accent-secondary-text)]">
              <Trophy size={20} />
              <p className="font-black uppercase tracking-[0.12em]">Event brief</p>
            </div>
            <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
              Manual payment confirmation
            </h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--text-secondary)]">
              <p className="flex items-center gap-2">
                <WalletCards size={16} /> {TZ_TOURNAMENT.paymentMethod}: {TZ_TOURNAMENT.paymentNumber}
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle size={16} /> Send screenshot: {TZ_TOURNAMENT.supportNumber}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays size={16} /> Slot confirmed by moderator after payment review
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Players" value="Tanzania only" />
          <StatCard icon={Gamepad2} label="Game" value={TZ_TOURNAMENT.game} />
          <StatCard icon={CircleDollarSign} label="Entry" value={TZ_TOURNAMENT.entryFeeLabel} />
          <StatCard icon={ShieldCheck} label="Confirm" value="WhatsApp screenshot" />
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <p className="section-title text-[var(--accent-secondary-text)]">Malipo</p>
            <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
              Lipa kabla slot haijathibitishwa
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <p>
                Kiingilio ni <strong className="text-[var(--text-primary)]">{TZ_TOURNAMENT.entryFeeLabel}</strong>.
              </p>
              <p>
                Tumia <strong className="text-[var(--text-primary)]">{TZ_TOURNAMENT.paymentMethod}</strong>{' '}
                kwenda <strong className="text-[var(--text-primary)]">{TZ_TOURNAMENT.paymentNumber}</strong>.
              </p>
              <p>
                Baada ya kulipa, tuma screenshot ya muamala WhatsApp{' '}
                <strong className="text-[var(--text-primary)]">{TZ_TOURNAMENT.supportNumber}</strong>.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary">
                Fungua fomu
                <ArrowRight size={16} />
              </Link>
              <a href={getTanzaniaTournamentCallUrl()} className="btn-ghost">
                <Phone size={16} />
                Piga simu
              </a>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              ['Jisajili kwenye Mechi', 'Weka jina kamili, namba ya simu, WhatsApp, na jina lako la eFootball Mobile.'],
              ['Lipa Airtel Money', `Tuma ${TZ_TOURNAMENT.entryFeeLabel} kwenda ${TZ_TOURNAMENT.paymentNumber}.`],
              ['Tuma screenshot', `Tuma uthibitisho wa muamala WhatsApp ${TZ_TOURNAMENT.supportNumber}.`],
              ['Subiri confirmation', 'Moderator wa Days Esports ataweka payment status na kuthibitisha slot yako.'],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-lg border border-[var(--border-color)] p-4">
                <p className="text-sm font-black text-[var(--accent-secondary-text)]">0{index + 1}</p>
                <p className="mt-2 font-black text-[var(--text-primary)]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                <CheckCircle2 size={18} />
                <p className="section-title">Match-ready checklist</p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Hakikisha jina la eFootball na Konami ID ziko sawa. Details zisipolingana zinaweza
                kuchelewesha confirmation siku ya kupanga matches.
              </p>
            </div>
            <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary shrink-0">
              Jisajili sasa
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <FooterSection className="!pt-6 md:!pt-10" />
    </div>
  );
}
