import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WekaMaweClient } from '@/app/playmechi/weka-mawe/weka-mawe-client';
import { WEKA_MAWE_TITLE } from '@/lib/weka-mawe-shared';

export const metadata: Metadata = {
  title: `Register | ${WEKA_MAWE_TITLE}`,
};

export default function WekaMaweRegisterPage() {
  return (
    <Suspense fallback={null}>
      <WekaMaweClient mode="register" />
    </Suspense>
  );
}
