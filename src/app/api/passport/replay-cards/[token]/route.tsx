import { ImageResponse } from 'next/og';
import { after, NextRequest } from 'next/server';
import { getPublicPassportReplay } from '@/lib/passport-progression';
import { capturePassportProductEvent, passportAnalyticsRequestSeed } from '@/lib/passport-analytics';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const replay = await getPublicPassportReplay(token);
  if (!replay) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#071018', color: 'white', fontSize: 38, fontWeight: 900 }}>Replay is private or unavailable</div>, { width: 1200, height: 630, status: 404 });
  const exact = replay.payload.exact;
  if (request.nextUrl.searchParams.get('download') === '1') {
    const requestSeed = passportAnalyticsRequestSeed(request);
    after(() => capturePassportProductEvent({
      event: 'passport_replay_shared',
      subjectUserId: replay.user_id,
      actorKind: 'anonymous',
      source: 'api.passport.replay-card',
      properties: { channel: 'download', replay_year: replay.replay_year },
      dedupeSeed: requestSeed,
    }));
  }
  const response = new ImageResponse(<div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', flexDirection: 'column', justifyContent: 'space-between', padding: 56, background: 'linear-gradient(145deg,#071018 0%,#102438 62%,#0c6159 100%)', color: 'white', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', position: 'absolute', width: 520, height: 520, right: -170, top: -240, borderRadius: 9999, background: '#32e0c4', opacity: .14 }}/>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 950, fontSize: 23, letterSpacing: 3 }}>PLAYMECHI</span><span style={{ color: '#32e0c4', fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>ANNUAL GAMER REPLAY</span></div>
    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: '#32e0c4', fontSize: 22, fontWeight: 900 }}>@{replay.username}</span><span style={{ marginTop: 10, fontSize: 62, lineHeight: 1, fontWeight: 950 }}>{replay.display_name}&apos;s {replay.replay_year}</span><span style={{ marginTop: 16, color: '#ffffff99', fontSize: 18 }}>{replay.payload.period_label} · exact Passport sources</span></div>
    <div style={{ display: 'flex', gap: 14 }}><Metric value={exact.games_added} label="GAMES ADDED"/><Metric value={exact.games_completed} label="COMPLETED"/><Metric value={exact.verified_matches} label="MATCHES"/><Metric value={exact.wins} label="WINS"/><Metric value={exact.distinct_events} label="EVENTS"/></div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff88', fontSize: 14 }}><span>Exact values and estimates are separated on the full Replay.</span><span style={{ fontWeight: 900, color: 'white' }}>mechi.club/replay</span></div>
  </div>, { width: 1200, height: 630 });
  response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  response.headers.set('Content-Disposition', `${request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${replay.username}-${replay.replay_year}-replay.png"`);
  return response;
}

function Metric({ value, label }: { value: number; label: string }) { return <div style={{ display: 'flex', flex: 1, flexDirection: 'column', border: '1px solid #ffffff20', borderRadius: 18, padding: '16px 18px', background: '#ffffff0a' }}><span style={{ fontSize: 34, fontWeight: 950 }}>{value}</span><span style={{ marginTop: 5, fontSize: 11, color: '#ffffff77', fontWeight: 900, letterSpacing: 1 }}>{label}</span></div>; }
