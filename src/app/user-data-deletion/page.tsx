import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { UserDataDeletionRequestForm } from '@/components/UserDataDeletionRequestForm';
import { APP_URL } from '@/lib/urls';

const EFFECTIVE_DATE = 'April 19, 2026';

export const metadata: Metadata = {
  title: 'User Data Deletion | Mechi',
  description:
    'Learn how to request deletion of your Mechi account data and what limited records may still be retained for legal, billing, fraud, or dispute reasons.',
  alternates: {
    canonical: `${APP_URL}/user-data-deletion`,
  },
  openGraph: {
    title: 'User Data Deletion | Mechi',
    description:
      'Learn how to request deletion of your Mechi account data and what limited records may still be retained.',
    url: `${APP_URL}/user-data-deletion`,
    type: 'article',
  },
  twitter: {
    title: 'User Data Deletion | Mechi',
    description:
      'Learn how to request deletion of your Mechi account data and what limited records may still be retained.',
  },
};

const sections = [
  {
    title: '1. How to request deletion',
    paragraphs: [
      'If you want Mechi to delete your account data, use the deletion request form on this page or email support@mechi.club with the subject line "User Data Deletion Request."',
      'To help us find the correct account quickly, include your Mechi username, the phone number or email linked to the account, and a short note confirming that you want the account and related personal data reviewed for deletion.',
    ],
  },
  {
    title: '2. Identity verification',
    paragraphs: [
      'Before we process a deletion request, we may ask you to verify that you own the account. This helps protect players from unauthorized or fraudulent deletion requests.',
      'If we cannot confirm account ownership, we may ask for additional details before taking action.',
    ],
  },
  {
    title: '3. What we delete',
    paragraphs: [
      'Once a deletion request is confirmed, we will disable account access and remove or anonymize personal data that Mechi no longer needs to keep in order to operate lawfully and protect the platform.',
    ],
    bullets: [
      'Profile details such as username, contact details, avatar, region, platform settings, and saved profile preferences where deletion is permitted.',
      'Linked gameplay and account metadata that is no longer required for operational, safety, billing, or legal reasons.',
      'Other account-linked personal data that can reasonably be deleted without breaking records we are required to keep.',
    ],
  },
  {
    title: '4. Data we may retain',
    paragraphs: [
      'Some limited records may need to be retained even after a deletion request is completed. This can apply where retention is required by law or where Mechi needs the record for legitimate safety, billing, fraud, moderation, or dispute-related reasons.',
    ],
    bullets: [
      'Billing, payment, subscription, refund, or accounting records where retention is legally or operationally required.',
      'Fraud-prevention, moderation, security, abuse, or audit records needed to protect the platform and other users.',
      'Limited match, tournament, dispute, or competition-integrity records where keeping a record is necessary to preserve fair-play history or comply with legal obligations.',
    ],
  },
  {
    title: '5. Contact and follow-up',
    paragraphs: [
      'If you have questions about a deletion request or want help identifying the correct account, contact support@mechi.club.',
      'For broader privacy details, you can also review the Mechi Privacy Policy.',
    ],
  },
] satisfies Parameters<typeof LegalPage>[0]['sections'];

export default function UserDataDeletionPage() {
  return (
    <LegalPage
      title="User Data Deletion"
      description="This page explains how to request deletion of your Mechi account data, how we verify deletion requests, and what limited records may still need to be retained."
      effectiveDate={EFFECTIVE_DATE}
      contactEmail="support@mechi.club"
      sections={sections}
      secondaryLink={{
        href: '/privacy-policy',
        label: 'Read Privacy Policy',
      }}
    >
      <UserDataDeletionRequestForm />
    </LegalPage>
  );
}
