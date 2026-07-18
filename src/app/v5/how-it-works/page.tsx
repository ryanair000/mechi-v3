import type { Metadata } from 'next';
import { V5HowItWorksPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'How It Works | Mechi V5',
  description: 'Learn how PlayMechi matchmaking, challenges, verification and rankings work.',
};

export default function Page() {
  return <V5HowItWorksPage />;
}
