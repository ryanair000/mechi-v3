import type { Metadata } from 'next';
import { GamingCirclesManager } from './gaming-circles-manager';
export const metadata: Metadata = { title: 'Gaming Circles | Mechi V5' };
export default function GamingCirclesPage() { return <GamingCirclesManager />; }
