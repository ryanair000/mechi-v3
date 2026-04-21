import type { Metadata } from 'next';
import ManualTestKitClient from './manual-test-kit-client';
import { TESTS_URL, manualTestSections } from './manual-test-kit';

export const metadata: Metadata = {
  title: 'Mechi Manual Checklist | Mechi',
  description: 'A simpler human checklist for running manual tests across Mechi.',
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
