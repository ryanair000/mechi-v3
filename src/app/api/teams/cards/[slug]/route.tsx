import { ImageResponse } from 'next/og';
import { getTeamPassport } from '@/lib/passport-community';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const team = await getTeamPassport((await params).slug); if (!team) return new Response('Not found', { status: 404 });
  return new ImageResponse(<div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '70px', color: 'white', background: 'linear-gradient(135deg,#071018,#132437)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 26, fontWeight: 800, color: team.card_accent }}>PLAYMECHI TEAM PASSPORT</div><div style={{ fontSize: 22, color: '#8da3b8' }}>{team.region}</div></div><div><div style={{ fontSize: 76, fontWeight: 900 }}>{team.name}</div><div style={{ marginTop: 18, fontSize: 30, color: '#aab9c8' }}>{team.supported_games.join(' · ') || 'Competitive gaming team'}</div></div><div style={{ display: 'flex', gap: '22px' }}><Metric label="ACTIVE PLAYERS" value={team.members.filter((member) => member.status === 'active').length} /><Metric label="VERIFIED MATCHES" value={team.match_summary.completed} /><Metric label="TEAM WINS" value={team.match_summary.wins} /><Metric label="ACHIEVEMENTS" value={team.achievements.length} /></div></div>, { width: 1200, height: 630 });
}

function Metric({ label, value }: { label: string; value: number }) { return <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #284053', borderRadius: '20px', padding: '20px 30px', minWidth: '210px' }}><div style={{ fontSize: 38, fontWeight: 900 }}>{value}</div><div style={{ marginTop: '6px', fontSize: 16, color: '#7890a5' }}>{label}</div></div>; }
