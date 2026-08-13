import type { Metadata } from 'next';
import { GamerCvSettings } from './gamer-cv-settings';

export const metadata: Metadata = { title: 'Gamer CV Settings | Mechi V5' };
export default function GamerCvSettingsPage() { return <GamerCvSettings />; }
