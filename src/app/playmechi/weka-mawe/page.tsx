import type { Metadata } from 'next';
import { WekaMaweClient } from '@/app/playmechi/weka-mawe/weka-mawe-client';
import { WEKA_MAWE_TITLE } from '@/lib/weka-mawe-shared';

export const metadata: Metadata = {
  title: `${WEKA_MAWE_TITLE} | Mechi.club`,
  description: 'Weekly eFootball bracket on Mechi.club. Register, check in, and play for Weka Mawe.',
};

export default function WekaMawePage() {
  return <WekaMaweClient mode="landing" />;
}
