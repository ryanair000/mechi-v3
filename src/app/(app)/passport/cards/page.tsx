import type { Metadata } from 'next';
import { GamerCardStudio } from './gamer-card-studio';

export const metadata: Metadata = {
  title: 'Gamer Card Studio | Mechi V5',
  description: 'Generate shareable Gamer Cards from your PlayMechi Passport.',
};

export default function GamerCardsPage() {
  return <GamerCardStudio />;
}
