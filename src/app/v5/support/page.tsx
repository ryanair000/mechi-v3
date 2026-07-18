import type { Metadata } from 'next';
import { V5SupportPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Support | Mechi V5',
  description: 'Get PlayMechi support for accounts, matches, tournaments and rewards.',
};

export default function Page() {
  return <V5SupportPage />;
}
