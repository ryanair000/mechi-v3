import type { Metadata } from 'next';
import { PassportReplayStudio } from './passport-replay-studio';

export const metadata: Metadata = { title: 'Annual Gamer Replay | Mechi V5', description: 'Turn your exact Passport activity into a transparent, shareable annual gaming story.' };
export default function PassportReplayPage() { return <PassportReplayStudio />; }
