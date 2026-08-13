import type { Metadata } from 'next';
import { PassportProgressionDashboard } from './passport-progression-dashboard';

export const metadata: Metadata = { title: 'Gamer Progression | Mechi V5', description: 'Understand your six Gamer Dimensions and collectible Passport achievements.' };
export default function PassportProgressionPage() { return <PassportProgressionDashboard />; }
