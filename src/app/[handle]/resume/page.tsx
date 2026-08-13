import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PassportResumeView } from '@/components/PassportResumeView';
import { normalizePassportUsername } from '@/lib/passport';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ handle: string }> };
function usernameFromHandle(handle: string) { const decoded = decodeURIComponent(handle); return decoded.startsWith('@') ? normalizePassportUsername(decoded) : ''; }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const username = usernameFromHandle((await params).handle); return { title: `@${username} Competitive Resume | Mechi V5` }; }
export default async function PublicResumePage({ params }: Props) { const username = usernameFromHandle((await params).handle); const resume = username ? await getPassportCompetitiveResume(username) : null; if (!resume) notFound(); return <div className="min-h-screen bg-[linear-gradient(180deg,#071018,#0d1724)] text-white"><PassportResumeView resume={resume} /></div>; }
