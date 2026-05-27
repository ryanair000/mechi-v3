import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import {
  PLAYMECHI_CONTACT_EMAIL,
  PLAYMECHI_DEVELOPER_ADDRESS,
  PLAYMECHI_DEVELOPER_NAME,
} from '@/lib/legal-contact';
import { APP_URL } from '@/lib/urls';

const EFFECTIVE_DATE = 'April 19, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy | PlayMechi',
  description:
    'Learn how PlayMechi collects, uses, stores, and shares information when you use our matchmaking, tournament, and subscription features.',
  alternates: {
    canonical: `${APP_URL}/privacy-policy`,
  },
  openGraph: {
    title: 'Privacy Policy | PlayMechi',
    description:
      'Learn how PlayMechi collects, uses, stores, and shares information when you use our services.',
    url: `${APP_URL}/privacy-policy`,
    type: 'article',
  },
  twitter: {
    title: 'Privacy Policy | PlayMechi',
    description:
      'Learn how PlayMechi collects, uses, stores, and shares information when you use our services.',
  },
};

const sections = [
  {
    title: '1. Information we collect',
    paragraphs: [
      'We collect information you give us directly when you create an account, set up your player profile, contact support, join paid plans, or participate in matches, lobbies, and tournaments on PlayMechi.',
    ],
    bullets: [
      'Account details such as your name, username, email address, password credentials, and profile settings.',
      'Player and activity data such as selected games, match history, tournament participation, rankings, reports, uploaded media, and support messages.',
      'Transaction details connected to subscriptions, tournament payments, refunds, or billing status processed through our payment partners.',
      'Technical and usage data such as device information, approximate location, browser details, IP address, referral pages, product analytics events, and session diagnostics that help us keep the platform stable and secure.',
    ],
  },
  {
    title: '2. How we use information',
    paragraphs: [
      'We use personal information to operate PlayMechi, improve the player experience, and protect the community from fraud, abuse, and match integrity issues.',
    ],
    bullets: [
      'To create and maintain your account, authenticate sessions, and personalize your profile and dashboard.',
      'To run matchmaking, lobbies, direct challenges, tournaments, rankings, notifications, and support workflows.',
      'To process subscriptions, confirm payments, prevent fraudulent activity, and keep financial records where required.',
      'To analyze product usage, troubleshoot failures, monitor performance, and improve the features we build.',
      'To enforce our rules, investigate cheating or abuse, and comply with legal obligations.',
    ],
  },
  {
    title: '3. When we share information',
    paragraphs: [
      'We do not sell your personal information. We share information only when it is necessary to provide the service, comply with the law, or protect PlayMechi, our users, and the integrity of competition on the platform.',
    ],
    bullets: [
      'With service providers that help us host the app, send emails, analyze usage, store files, or support customer operations.',
      'With payment providers and financial partners that process subscription or tournament transactions on our behalf.',
      'With other users to the extent your public profile, match results, rankings, tournament entries, or shared links are visible inside the product.',
      'With authorities, regulators, courts, or law enforcement when required by law or when reasonably necessary to prevent fraud, abuse, or security threats.',
      'As part of a merger, acquisition, financing, or asset sale if the business changes hands, subject to appropriate confidentiality protections.',
    ],
  },
  {
    title: '4. Data retention',
    paragraphs: [
      'We keep information for as long as we reasonably need it to operate PlayMechi, maintain competition records, resolve disputes, meet legal or accounting requirements, and protect against fraud or abuse.',
      'Retention periods can vary depending on the kind of data involved. For example, account records, payment records, moderation logs, and tournament outcomes may be kept longer than routine analytics data.',
    ],
  },
  {
    title: '5. Your choices and rights',
    paragraphs: [
      'You can review and update parts of your account information inside the product. You may also contact us if you want to request access, correction, deletion, or help with an account-related privacy issue.',
      'We may ask you to verify your identity before completing a request, and we may keep limited information where the law requires it or where we need it for fraud prevention, dispute resolution, or enforcement purposes.',
    ],
  },
  {
    title: '6. Security and international processing',
    paragraphs: [
      'We use reasonable administrative, technical, and organizational safeguards to protect personal information. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.',
      'PlayMechi may use providers in more than one country to host infrastructure, process payments, or deliver support tools. By using the service, you understand that information may be processed outside your home country where different data protection rules may apply.',
    ],
  },
  {
    title: '7. Children and policy updates',
    paragraphs: [
      'PlayMechi is not intended for children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to us, please contact us so we can investigate and take appropriate action.',
      'We may update this Privacy Policy from time to time. When we make material changes, we may revise the date above and provide additional notice inside the product or through other reasonable channels.',
    ],
  },
  {
    title: '8. Contact us',
    paragraphs: [
      `Questions about this Privacy Policy or privacy requests can be sent to ${PLAYMECHI_DEVELOPER_NAME} at ${PLAYMECHI_CONTACT_EMAIL}.`,
      `Mailing address: ${PLAYMECHI_DEVELOPER_ADDRESS}.`,
    ],
  },
] satisfies Parameters<typeof LegalPage>[0]['sections'];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This Privacy Policy explains how PlayMechi collects, uses, stores, and shares information when you use our website, apps, tournaments, subscriptions, and related services."
      effectiveDate={EFFECTIVE_DATE}
      contactEmail={PLAYMECHI_CONTACT_EMAIL}
      developerName={PLAYMECHI_DEVELOPER_NAME}
      developerAddress={PLAYMECHI_DEVELOPER_ADDRESS}
      sections={sections}
      secondaryLink={{
        href: '/terms-of-service',
        label: 'Read Terms of Service',
      }}
    />
  );
}
