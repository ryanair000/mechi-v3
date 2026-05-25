import type { Metadata } from 'next';
import ManualTestKitClient from './manual-test-kit-client';
import { TESTS_URL, manualTestSections } from './manual-test-kit';

export const metadata: Metadata = {
  title: 'PlayMechi Manual Test Kit | PlayMechi',
  description: 'An interactive manual QA kit for testing PlayMechi end to end.',
  alternates: {
    canonical: TESTS_URL,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ManualTestsPage() {
  return <ManualTestKitClient sections={manualTestSections} />;
}
