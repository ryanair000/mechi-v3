import type { Metadata } from 'next';
import { V5HomePage } from '@/components/v5/V5Public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PlayMechi | Competitive Gaming for Africa',
  description:
    'Find approved tournaments, grow a trusted player record, and host competition across Africa.',
};

export default function PlayMechiPage() {
  return <V5HomePage />;
}
