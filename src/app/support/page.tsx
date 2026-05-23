import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertCircle,
  CreditCard,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
} from 'lucide-react';
import FooterSection from '@/components/footer';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  getCustomerWhatsAppSupportUrl,
  PLAYMECHI_WHATSAPP_GROUP_URL,
} from '@/lib/social-links';
import {
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Support | Mechi.club',
  description:
    'Get clear next steps for registration, payments, sign-in trouble, and reporting issues on Mechi.',
};

const supportCards = [
  {
    title: 'Registration help',
    description:
      'Use this if you are trying to enter Weekend Cup, your slot looks unclear, or you need the direct register route again.',
    href: WEEKEND_CUP_REGISTRATION_PATH,
    label: 'Register for Weekend Cup',
    icon: UserRoundCheck,
  },
  {
    title: 'Need help with payment?',
    description:
      'If you paid and the slot still looks pending, start here first. We can check the payment trail and tell you the next move.',
    href: WEEKEND_CUP_SUPPORT_URL,
    label: 'Open payment help',
    icon: CreditCard,
    external: true,
  },
  {
    title: 'Sign-in or account help',
    description:
      'Use this if you keep getting sent back to login, your account feels stuck, or a protected action will not let you continue.',
    href: getCustomerWhatsAppSupportUrl(
      'Hi Mechi, I need help with sign-in or my account flow.'
    ),
    label: 'Open account help',
    icon: ShieldCheck,
    external: true,
  },
  {
    title: 'Report a bug',
    description:
      'If the screen is broken, a button does nothing, or the flow feels wrong, send a screenshot and the route so the team can fix it fast.',
    href: '/report',
    label: 'Report an issue',
    icon: AlertCircle,
  },
];

const nextSteps = [
  'If payment already succeeded, do not pay twice right away. Open payment help first with your reference if you have it.',
  'If a vote or suggestion did not stick, sign in again once, retry the action, then use support if it still fails.',
  'If a page looks wrong, include the exact route and a screenshot. That is the fastest way to get it fixed.',
];

export default function SupportPage() {
  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <PlayMechiHomeHeader />

      <main className="page-container max-w-5xl space-y-6 pb-12 pt-4 sm:pt-6">
        <section className="card circuit-panel p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="section-title">Support + Status</p>
            <h1 className="mt-3 text-[2rem] font-black leading-[0.98] text-[var(--text-primary)] sm:text-[3rem]">
              Clear next steps when Mechi feels unclear.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              This page is the fastest recovery lane for {WEEKEND_CUP_TITLE}, sign-in trouble,
              payment questions, and broken screens. If you are stuck, start here instead of
              guessing.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="brand-chip px-3 py-1">WhatsApp support live</span>
              <span className="brand-chip-coral px-3 py-1">
                {CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}
              </span>
              <span className="brand-chip px-3 py-1">Screenshot-first bug reporting</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {supportCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div className="card h-full p-5 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)]">
                  <Icon size={18} />
                </div>
                <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {card.description}
                </p>
                <div className="mt-5">
                  <span className="btn-outline inline-flex !rounded-[var(--radius-control)]">
                    {card.label}
                  </span>
                </div>
              </div>
            );

            return card.external ? (
              <a key={card.title} href={card.href} className="block h-full">
                {content}
              </a>
            ) : (
              <Link key={card.title} href={card.href} className="block h-full">
                {content}
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-5 sm:p-6">
            <p className="section-title">Before you retry</p>
            <ul className="mt-4 space-y-3">
              {nextSteps.map((step) => (
                <li
                  key={step}
                  className="flex items-start gap-3 text-sm leading-7 text-[var(--text-secondary)]"
                >
                  <LifeBuoy
                    size={16}
                    className="mt-1 shrink-0 text-[var(--accent-secondary-text)]"
                  />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5 sm:p-6">
            <p className="section-title">Fast channels</p>
            <div className="mt-4 grid gap-3">
              <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-primary justify-center">
                <MessageCircle size={15} />
                Weekend Cup help
              </a>
              <a
                href={getCustomerWhatsAppSupportUrl('Hi Mechi, I need general help.')}
                className="btn-outline justify-center"
              >
                <MessageCircle size={15} />
                General WhatsApp help
              </a>
              <a href={PLAYMECHI_WHATSAPP_GROUP_URL} className="btn-ghost justify-center">
                <Smartphone size={15} />
                Join PlayMechi WhatsApp
              </a>
              <a href="mailto:support@mechi.club" className="btn-ghost justify-center">
                <LifeBuoy size={15} />
                support@mechi.club
              </a>
            </div>
          </div>
        </section>
      </main>

      <FooterSection className="!pt-4 md:!pt-8" />
    </div>
  );
}
