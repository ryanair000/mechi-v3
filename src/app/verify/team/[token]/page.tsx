import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, ShieldCheck, ShieldX, Users } from 'lucide-react';
import { getTeamPassportAchievementByToken } from '@/lib/passport-community';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> { const achievement = await getTeamPassportAchievementByToken((await params).token); return achievement ? { title: `${achievement.title} | Mechi Verified Team Achievement`, description: `Verified team achievement for ${achievement.team_name}.` } : { title: 'Team Achievement Not Found | Mechi' }; }

export default async function VerifyTeamAchievementPage({ params }: { params: Promise<{ token: string }> }) {
  const achievement = await getTeamPassportAchievementByToken((await params).token); if (!achievement) notFound(); const active = achievement.state === 'active';
  return <main className="flex min-h-screen items-center justify-center bg-[#071018] px-4 py-10 text-white"><article className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0e1927] p-7 shadow-2xl sm:p-10"><div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${active ? 'bg-[#32E0C4]/10 text-[#32E0C4]' : 'bg-rose-500/10 text-rose-400'}`}>{active ? <ShieldCheck size={28} /> : <ShieldX size={28} />}</div><p className={`mt-5 text-xs font-black uppercase tracking-[.2em] ${active ? 'text-[#32E0C4]' : 'text-rose-400'}`}>{active ? 'Verified team achievement' : 'Revoked team achievement'}</p><h1 className="mt-3 text-3xl font-black">{achievement.title}</h1><p className="mt-2 text-white/65">{achievement.description}</p><div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm text-white/50"><p className="flex items-center gap-2"><Users size={15} />Awarded to <Link className="font-bold text-white" href={`/teams/${achievement.team_slug}`}>{achievement.team_name}</Link></p><p className="flex items-center gap-2"><CalendarDays size={15} />Occurred {new Date(achievement.occurred_at).toLocaleString()}</p><p>Source: {achievement.source_type.replaceAll('_', ' ')}</p><p>Issued {new Date(achievement.issued_at).toLocaleString()}</p></div>{!active ? <p className="mt-6 rounded-xl bg-rose-500/8 p-4 text-sm text-rose-200/70">This record remains visible for audit history but no longer counts as a verified team achievement. {achievement.revocation_reason}</p> : null}</article></main>;
}
