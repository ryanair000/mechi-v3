import type { Metadata } from 'next';
import { PassportMediaKitManager } from './passport-media-kit-manager';

export const metadata: Metadata = { title: 'Gamer Media Kit | Mechi V5', description: 'Publish a sponsor-safe creator and organizer media kit from your Gamer Passport.' };
export default function PassportMediaKitPage() { return <PassportMediaKitManager />; }
