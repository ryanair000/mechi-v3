import type { Metadata } from 'next';
import ReportIssueClient from './report-issue-client';
import { TESTS_URL } from '@/app/manual-tests/manual-test-kit';

export const metadata: Metadata = {
  title: 'Report A Test Issue | PlayMechi',
  description: 'Submit screenshots and issue notes for the PlayMechi test environment.',
  alternates: {
    canonical: `${TESTS_URL}/report`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportIssuePage() {
  return <ReportIssueClient />;
}
