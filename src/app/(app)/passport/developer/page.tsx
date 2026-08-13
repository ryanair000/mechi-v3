import type { Metadata } from 'next';
import { PassportDeveloperConsole } from './passport-developer-console';

export const metadata: Metadata = { title: 'Passport Developer Access | Mechi V5', description: 'Create scoped, revocable API tokens and webhook subscriptions for your Gamer Passport.' };
export default function PassportDeveloperPage() { return <PassportDeveloperConsole/>; }
