import type { Metadata } from 'next';
import { PassportConnectionsManager } from './passport-connections-manager';

export const metadata: Metadata = { title: 'Platform Connections | Mechi V5', description: 'Connect verified gaming accounts and review exactly what enters your Gamer Passport.' };
export default async function PassportConnectionsPage({ searchParams }: { searchParams: Promise<{ connected?: string; connection_error?: string }> }) { const query = await searchParams; return <PassportConnectionsManager initialNotice={query.connected === 'steam' ? 'Steam ownership verified. You can now sync your visible library.' : null} initialError={query.connection_error ?? null}/>; }
