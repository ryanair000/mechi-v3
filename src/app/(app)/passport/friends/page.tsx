import type { Metadata } from 'next';
import { PassportFriendsHub } from './passport-friends-hub';

export const metadata: Metadata = { title: 'Friends & Recommendations | Mechi V5' };
export default function PassportFriendsPage() { return <PassportFriendsHub />; }
