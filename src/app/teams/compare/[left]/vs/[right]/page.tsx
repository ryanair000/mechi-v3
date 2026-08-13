import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeamPassport } from '@/lib/passport-community';

export const dynamic = 'force-dynamic';

export default async function TeamComparisonPage({ params }: { params: Promise<{ left: string; right: string }> }) {
  const { left, right } = await params; if (left === right) notFound();
  const [a, b] = await Promise.all([getTeamPassport(left), getTeamPassport(right)]); if (!a || !b) notFound();
  const shared = a.supported_games.filter((game) => b.supported_games.includes(game));
  return <main className="min-h-screen bg-[#071018] px-4 py-8 text-white"><div className="mx-auto max-w-5xl"><p className="text-center text-xs font-black uppercase tracking-[.2em] text-[#32E0C4]">Mechi V5 Team Comparison</p><h1 className="mt-3 text-center text-4xl font-black">{a.name} <span className="text-white/25">vs</span> {b.name}</h1><div className="mt-8 grid gap-5 md:grid-cols-2"><TeamColumn team={a} /><TeamColumn team={b} /></div><section className="mt-5 rounded-2xl border border-white/10 p-5 text-center"><h2 className="font-black">Shared competitive games</h2><p className="mt-3 text-white/50">{shared.length ? shared.join(' · ') : 'No visible supported-game overlap yet'}</p></section></div></main>;
}

function TeamColumn({ team }: { team: NonNullable<Awaited<ReturnType<typeof getTeamPassport>>> }) { return <article className="rounded-[2rem] border border-white/10 bg-[#0e1927] p-6"><Link href={`/teams/${team.slug}`} className="text-2xl font-black hover:text-[#32E0C4]">{team.name}</Link><div className="mt-5 grid grid-cols-3 gap-2 text-center"><Stat label="Players" value={team.members.filter((member) => member.status === 'active').length} /><Stat label="Matches" value={team.match_summary.completed} /><Stat label="Wins" value={team.match_summary.wins} /></div><p className="mt-5 text-sm text-white/45">{team.tournaments.length} tournament entries · {team.achievements.length} verified achievements</p><p className="mt-3 text-xs uppercase tracking-wider text-[#32E0C4]">{team.recruitment_status} recruitment</p></article>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-black/15 p-3"><p className="text-2xl font-black">{value}</p><p className="text-[10px] uppercase text-white/35">{label}</p></div>; }
