import type { Metadata } from 'next';
import { PassportResumeManager } from './passport-resume-manager';

export const metadata: Metadata = { title: 'Competitive Resume | Mechi V5' };
export default function PassportResumePage() { return <PassportResumeManager />; }
