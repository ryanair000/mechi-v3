import type { Metadata } from 'next';
import { PassportHighlightsManager } from './passport-highlights-manager';

export const metadata: Metadata = { title: 'Passport Highlights | Mechi V5', description: 'Curate verified gaming moments on your public Gamer Passport.' };

export default function PassportHighlightsPage() { return <PassportHighlightsManager />; }
