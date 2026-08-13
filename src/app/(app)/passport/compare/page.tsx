import type { Metadata } from 'next';
import { PassportDiscovery } from './passport-discovery';

export const metadata: Metadata = { title: 'Compare Gamer Passports | Mechi V5' };
export default function PassportComparePage() { return <PassportDiscovery />; }
