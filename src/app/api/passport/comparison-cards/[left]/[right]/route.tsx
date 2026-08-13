import { ImageResponse } from 'next/og';
import { getPassportComparison } from '@/lib/passport-comparison';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ left: string; right: string }> }) {
  const { left, right } = await params;
  const result = await getPassportComparison(left, right);
  if (!result.data) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#071018', color: 'white', fontSize: 42 }}>Comparison unavailable</div>, { width: 1200, height: 630, status: result.status });
  const comparison = result.data;
  const player = (side: 'left' | 'right') => comparison[side];
  return new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', background: 'linear-gradient(135deg,#071018,#12263b 55%,#112c2c)', color: 'white', fontFamily: 'sans-serif', padding: 54 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, letterSpacing: 3 }}><span style={{ color: '#32E0C4' }}>PLAYMECHI</span><span style={{ color: '#ffffff88' }}>GAMER PASSPORT COMPARISON</span></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30 }}>
        {(['left', 'versus', 'right'] as const).map((item) => item === 'versus'
          ? <div key={item} style={{ display: 'flex', width: 74, height: 74, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '2px solid #32E0C466', background: '#32E0C41a', color: '#32E0C4', fontSize: 24, fontWeight: 950 }}>VS</div>
          : <div key={item} style={{ display: 'flex', flex: 1, flexDirection: item === 'right' ? 'row-reverse' : 'row', alignItems: 'center', gap: 22, textAlign: item === 'right' ? 'right' : 'left' }}><div style={{ display: 'flex', width: 112, height: 112, borderRadius: 30, alignItems: 'center', justifyContent: 'center', background: `${player(item).identity.card_accent}24`, border: `3px solid ${player(item).identity.card_accent}`, fontSize: 48, fontWeight: 950 }}>{player(item).identity.username[0]?.toUpperCase()}</div><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 25, color: player(item).identity.card_accent, fontWeight: 900 }}>@{player(item).identity.username}</span><span style={{ marginTop: 7, fontSize: 43, fontWeight: 950, letterSpacing: -2 }}>{player(item).identity.display_name}</span><span style={{ marginTop: 8, fontSize: 17, color: '#ffffff88' }}>{player(item).library_stats.total} visible games · {player(item).library_stats.completed} completed</span></div></div>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid #ffffff22', paddingTop: 27 }}><div style={{ display: 'flex', gap: 42 }}><Metric label="TASTE MATCH" value={comparison.taste_match.score === null ? 'DISCOVER' : `${comparison.taste_match.score}%`} /><Metric label="SHARED GAMES" value={String(comparison.shared_games.length)} /><Metric label="VERIFIED RIVALRY" value={`${comparison.rivalry.left_wins}–${comparison.rivalry.right_wins}`} /></div><span style={{ fontSize: 18, fontWeight: 900 }}>mechi.club/compare/{comparison.left.identity.username}/vs/{comparison.right.identity.username}</span></div>
    </div>,
    { width: 1200, height: 630 }
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 31, fontWeight: 950 }}>{value}</span><span style={{ marginTop: 5, fontSize: 11, color: '#ffffff77', fontWeight: 900, letterSpacing: 1.5 }}>{label}</span></div>;
}
