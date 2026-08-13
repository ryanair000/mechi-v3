import { notFound } from 'next/navigation';
import { PassportResumeView } from '@/components/PassportResumeView';
import { normalizePassportUsername } from '@/lib/passport';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';

export const dynamic = 'force-dynamic';
export default async function GamerCvPage({ params }: { params: Promise<{ handle: string }> }) { const handle = decodeURIComponent((await params).handle); const username = handle.startsWith('@') ? normalizePassportUsername(handle) : ''; const resume = username ? await getPassportCompetitiveResume(username) : null; if (!resume) notFound(); return <div className="min-h-screen bg-[#071018] text-white"><PassportResumeView resume={resume} /></div>; }
