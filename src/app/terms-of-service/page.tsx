import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { APP_URL } from '@/lib/urls';

const EFFECTIVE_DATE = 'April 19, 2026';

export const metadata: Metadata = {
  title: 'Terms of Service | Mechi',
  description:
    'Read the terms that govern access to Mechi, including accounts, subscriptions, tournaments, player conduct, and platform rules.',
  alternates: {
    canonical: `${APP_URL}/terms-of-service`,
  },
  openGraph: {
    title: 'Terms of Service | Mechi',
    description:
      'Read the terms that govern access to Mechi, including accounts, subscriptions, tournaments, player conduct, and platform rules.',
    url: `${APP_URL}/terms-of-service`,
    type: 'article',
  },
  twitter: {
    title: 'Terms of Service | Mechi',
    description:
      'Read the terms that govern access to Mechi, including accounts, subscriptions, tournaments, player conduct, and platform rules.',
  },
};

const sections = [
  {
    title: '1. Acceptance of these terms',
    paragraphs: [
      'These Terms of Service govern your access to and use of Mechi, including our website, applications, matchmaking features, tournaments, subscriptions, and related services. By using Mechi, you agree to these terms and to our Privacy Policy.',
      'If you do not agree to these terms, you should not use the service.',
    ],
  },
  {
    title: '2. Eligibility and account responsibilities',
    paragraphs: [
      'You are responsible for the accuracy of the information you provide, for keeping your login credentials secure, and for all activity that happens through your account.',
    ],
    bullets: [
      'You must be legally able to use the service in your location and old enough to accept these terms.',
      'You may not impersonate another person, create misleading profiles, or bypass bans or restrictions.',
      'You must promptly notify us if you believe your account has been compromised.',
    ],
  },
  {
    title: '3. Using Mechi fairly',
    paragraphs: [
      'Mechi is built for organized competition and player coordination. You agree not to misuse the platform or interfere with fair play.',
    ],
    bullets: [
      'Do not cheat, exploit bugs, manipulate rankings, fix matches, submit false reports, or interfere with tournament or queue integrity.',
      'Do not harass, threaten, scam, spam, or post unlawful, abusive, or infringing content.',
      'Do not attempt unauthorized access, reverse engineer restricted systems, scrape the service in prohibited ways, or disrupt the platform through bots, malware, or attacks.',
    ],
  },
  {
    title: '4. Matches, tournaments, and moderation',
    paragraphs: [
      'Mechi may provide brackets, lobbies, direct challenges, rankings, and moderation tools, but we may still rely on player reports, tournament rules, and administrator review to resolve disputes.',
      'You agree to submit truthful results, follow posted event rules, cooperate with moderation requests, and accept reasonable integrity or dispute decisions made by Mechi or authorized tournament administrators.',
    ],
  },
  {
    title: '5. Paid plans, billing, and cancellations',
    paragraphs: [
      'Some features require a paid subscription or event payment. Prices, billing cadence, and plan features may be shown inside the product and may change over time.',
    ],
    bullets: [
      'Payments may be processed by third-party providers, and your use of those services may also be subject to their terms.',
      'Unless stated otherwise, fees are non-refundable except where required by law or where we expressly agree otherwise.',
      'If you cancel a recurring plan, access normally continues until the end of the already paid billing period and then stops renewing.',
    ],
  },
  {
    title: '6. Content and intellectual property',
    paragraphs: [
      'Mechi and its branding, software, design, content, and platform features are owned by Mechi or its licensors and are protected by applicable intellectual property laws.',
      'You keep ownership of content you submit, but you give us a non-exclusive license to host, use, reproduce, display, and distribute that content as needed to operate, secure, improve, and promote the service.',
    ],
  },
  {
    title: '7. Suspension and termination',
    paragraphs: [
      'We may suspend, restrict, or terminate access to Mechi if we believe you violated these terms, created risk for other users, failed to pay required fees, or used the service in a way that could expose Mechi or the community to harm.',
      'We may also remove content, cancel matches or tournaments, or reverse platform access where necessary to preserve platform integrity or comply with legal obligations.',
    ],
  },
  {
    title: '8. Disclaimers and limits of liability',
    paragraphs: [
      'Mechi is provided on an "as is" and "as available" basis. To the extent allowed by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability.',
      'To the extent allowed by law, Mechi and its affiliates, officers, employees, and partners will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, data, or competitive opportunity arising from or related to your use of the service.',
    ],
  },
  {
    title: '9. Changes to the service or these terms',
    paragraphs: [
      'We may update, suspend, or discontinue parts of Mechi at any time. We may also revise these Terms of Service from time to time. When changes are material, we may update the effective date above and provide additional notice where appropriate.',
      'Your continued use of Mechi after updated terms take effect means you accept the revised terms.',
    ],
  },
  {
    title: '10. Contact us',
    paragraphs: [
      'Questions about these Terms of Service can be sent to support@mechi.club.',
    ],
  },
] satisfies Parameters<typeof LegalPage>[0]['sections'];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These Terms of Service explain the rules for using Mechi, including account use, paid plans, tournament participation, player conduct, moderation, and platform rights."
      effectiveDate={EFFECTIVE_DATE}
      contactEmail="support@mechi.club"
      sections={sections}
      secondaryLink={{
        href: '/privacy-policy',
        label: 'Read Privacy Policy',
      }}
    />
  );
}
