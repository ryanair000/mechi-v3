import type { Metadata } from 'next';
import { V5PricingPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Pricing | Mechi V5',
  description: 'Compare Free, Pro and Elite PlayMechi plans in the V5 UI.',
};

export default function Page() {
  return <V5PricingPage />;
}
