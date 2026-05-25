import type { Metadata } from 'next';
import { WekaMaweClient } from '@/app/playmechi/weka-mawe/weka-mawe-client';
import { WEKA_MAWE_TITLE } from '@/lib/weka-mawe-shared';

export const metadata: Metadata = {
  title: `${WEKA_MAWE_TITLE} | PlayMechi`,
  description: 'Weekly eFootball bracket on PlayMechi. Register, check in, and play for Weka Mawe.',
};

export default function WekaMawePage() {
  return <WekaMaweClient mode="landing" />;
}
