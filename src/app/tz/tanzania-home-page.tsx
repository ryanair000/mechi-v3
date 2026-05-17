import Link from 'next/link';
import { ArrowRight, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import {
  TZ_TOURNAMENT,
  getTanzaniaTournamentCallUrl,
  getTanzaniaTournamentWhatsappUrl,
} from '@/lib/tanzania-tournament';

export function TanzaniaHomePage() {
  return (
    <main className="page-base min-h-screen bg-[#07111f] text-white" data-theme="dark">
      <section
        className="relative min-h-[88vh] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/game-artwork/efootball_mobile-header.webp')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,17,0.96),rgba(4,9,17,0.72),rgba(4,9,17,0.38))]" />
        <div className="relative mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-black tracking-[0.08em]">
              MECHI.CLUB
            </Link>
            <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary min-h-10 px-4 py-2 text-sm">
              Jisajili
              <ArrowRight size={15} />
            </Link>
          </header>

          <div className="max-w-3xl py-12">
            <p className="brand-kicker text-[var(--accent-secondary-text)]">Tanzania</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">
              {TZ_TOURNAMENT.swahiliTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
              Usajili wa mashindano ya eFootball Mobile kwa wachezaji wa Tanzania. Jisajili
              kupitia Mechi, lipa kiingilio kwa Airtel Money, kisha tuma screenshot ya malipo
              kwa Days Esports ili uthibitishwe.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary justify-center">
                Fungua usajili
                <ArrowRight size={16} />
              </Link>
              <a
                href={getTanzaniaTournamentWhatsappUrl('Habari Days Esports, nahitaji msaada kuhusu usajili wa tournament ya Tanzania.')}
                className="btn-ghost justify-center border-white/20 bg-white/8 text-white hover:bg-white/12"
              >
                <MessageCircle size={16} />
                Tuma WhatsApp
              </a>
            </div>
          </div>

          <div className="grid gap-3 pb-4 sm:grid-cols-3">
            {[
              ['Kiingilio', TZ_TOURNAMENT.entryFeeLabel],
              ['Malipo', TZ_TOURNAMENT.paymentMethod],
              ['Namba', TZ_TOURNAMENT.paymentNumber],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/14 bg-black/28 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">{label}</p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b1524] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="section-title text-[var(--accent-secondary-text)]">Maelekezo ya malipo</p>
            <h2 className="mt-3 text-2xl font-black text-white">Lipa kabla ya kuthibitishwa</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-white/72">
              <p>
                Kiingilio ni <strong className="text-white">{TZ_TOURNAMENT.entryFeeLabel}</strong>.
              </p>
              <p>
                Lipa kupitia <strong className="text-white">{TZ_TOURNAMENT.paymentMethod}</strong>{' '}
                kwenda <strong className="text-white">{TZ_TOURNAMENT.paymentNumber}</strong>.
              </p>
              <p>
                Baada ya kulipa, tuma screenshot ya ujumbe wa muamala kwenye WhatsApp ya{' '}
                <strong className="text-white">{TZ_TOURNAMENT.supportNumber}</strong> ili Days
                Esports wathibitishe nafasi yako.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="section-title text-[var(--accent-secondary-text)]">Msaada</p>
            <h2 className="mt-3 text-2xl font-black text-white">Unahitaji kuuliza?</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              Kwa uthibitisho wa malipo, msaada wa usajili, au maswali ya mashindano, tumia namba
              hii hii ya Days Esports.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={getTanzaniaTournamentWhatsappUrl()} className="btn-primary justify-center">
                <MessageCircle size={16} />
                Tuma WhatsApp
              </a>
              <a href={getTanzaniaTournamentCallUrl()} className="btn-ghost justify-center">
                <Phone size={16} />
                Piga simu
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center gap-2 text-[var(--accent-secondary-text)]">
            <ShieldCheck size={18} />
            <p className="section-title">Hatua za mchezaji</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Jaza fomu ya usajili', 'Weka jina lako, namba ya simu, WhatsApp, na jina lako la ndani ya eFootball Mobile.'],
              ['2', 'Lipa TSH 5,000', `Tumia Airtel Money kwenda ${TZ_TOURNAMENT.paymentNumber}.`],
              ['3', 'Tuma screenshot', `Tuma uthibitisho wa muamala kwa WhatsApp ${TZ_TOURNAMENT.supportNumber}.`],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent-primary)] text-sm font-black text-black">
                  {step}
                </span>
                <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/68">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <Link href={TZ_TOURNAMENT.registrationPath} className="btn-primary">
              Jisajili sasa
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
