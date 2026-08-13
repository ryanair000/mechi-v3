import type { Metadata } from 'next';
import { PassportActivityFeed } from '@/components/PassportActivityFeed';
export const metadata: Metadata = { title: 'Gaming Activity | Mechi V5' };
export default function FeedPage() { return <PassportActivityFeed />; }
