import type { Metadata } from 'next';
import { PassportGameLibraryManager } from './passport-game-library-manager';

export const metadata: Metadata = {
  title: 'My Game Library | Mechi V5',
  description: 'Build the game library behind your PlayMechi Gamer Passport.',
};

export default function PassportGamesPage() {
  return <PassportGameLibraryManager />;
}
