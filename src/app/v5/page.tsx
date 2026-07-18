import type { Metadata } from 'next';
import { V5HomePage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'PlayMechi | Competitive Gaming for Africa',
  description:
    'Find tournaments, build a trusted player record, host competition, and connect with Africa’s gaming ecosystem.',
};

export default function Page() {
  return <V5HomePage />;
}
