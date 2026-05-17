import type { Metadata } from 'next';
import { WekaMaweClient } from '@/app/playmechi/weka-mawe/weka-mawe-client';
import { WEKA_MAWE_TITLE } from '@/lib/weka-mawe-shared';

export const metadata: Metadata = {
  title: `Check In | ${WEKA_MAWE_TITLE}`,
};

export default function WekaMaweCheckInPage() {
  return <WekaMaweClient mode="check-in" />;
}
