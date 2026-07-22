import type { Metadata } from 'next';
import { V5BlogPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Blog | Mechi V5',
  description: 'Read PlayMechi field notes, tournament guides and platform updates.',
};

export default function Page() {
  return <V5BlogPage />;
}
