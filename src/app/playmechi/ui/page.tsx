import type { Metadata } from 'next';
import { PlayMechiUiIndex } from '@/components/playmechi/PlayMechiWorkspace';

export const metadata: Metadata = {
  title: 'PlayMechi Product UI',
  description: 'All approved PlayMechi responsive product screens.',
};

export default function PlayMechiUiPage() {
  return <PlayMechiUiIndex />;
}
