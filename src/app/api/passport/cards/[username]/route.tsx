import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import { PASSPORT_GAME_STATUS_LABELS } from '@/lib/passport-game-types';
import { getVisiblePassportProgression } from '@/lib/passport-progression';

export const runtime = 'nodejs';

type CardFormat = 'square' | 'story' | 'horizontal';

const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  horizontal: { width: 1200, height: 630 },
};

function resolveFormat(value: string | null): CardFormat {
  return value === 'square' || value === 'story' ? value : 'horizontal';
}

function errorCard(message: string, format: CardFormat, status = 404) {
  const size = CARD_SIZES[format];
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#071018', color: '#ffffff', fontFamily: 'sans-serif', fontSize: 42, fontWeight: 800 }}>{message}</div>,
    { ...size, status }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizePassportUsername(rawUsername);
  const format = resolveFormat(request.nextUrl.searchParams.get('format'));
  if (!username) return errorCard('Gamer Passport not found', format);

  const passport = await getPassportData(username);
  if (!passport) return errorCard('Gamer Passport not found', format);
  if (passport.access === 'restricted') return errorCard('This Gamer Passport is private', format, 403);

  const { identity, library, summary } = passport;
  const progression = await getVisiblePassportProgression(identity.user_id, null, false);
  const theme = progression.cosmetics.find((cosmetic) => cosmetic.type === 'theme');
  const cardStyle = progression.cosmetics.find((cosmetic) => cosmetic.type === 'card_style');
  const cosmeticAccent = String(theme?.style_tokens.accent ?? identity.card_accent);
  const cosmeticBackground = String(theme?.style_tokens.background ?? '#071018');
  const cosmeticSurface = String(theme?.style_tokens.surface ?? '#102438');
  const pattern = String(cardStyle?.style_tokens.pattern ?? 'core');
  const size = CARD_SIZES[format];
  const story = format === 'story';
  const square = format === 'square';
  const games = [...library.entries]
    .sort((left, right) => Number(right.is_featured) - Number(left.is_featured) || Number(right.is_favorite) - Number(left.is_favorite))
    .slice(0, story ? 5 : square ? 4 : 3);
  const response = new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', flexDirection: 'column', justifyContent: 'space-between', background: `linear-gradient(145deg, ${cosmeticBackground} 0%, ${cosmeticSurface} 62%, ${cosmeticAccent}35 100%)`, color: '#ffffff', fontFamily: 'sans-serif', padding: story ? 76 : square ? 62 : 48 }}>
      <div style={{ display: 'flex', position: 'absolute', width: story ? 720 : 480, height: story ? 720 : 480, borderRadius: pattern === 'signal' ? 40 : 9999, right: story ? -280 : -160, top: story ? -180 : -210, background: cosmeticAccent, opacity: pattern === 'aurora' ? 0.2 : 0.12, transform: pattern === 'signal' ? 'rotate(22deg)' : undefined }} />
      <div style={{ display: 'flex', position: 'absolute', width: story ? 560 : 360, height: story ? 560 : 360, borderRadius: 9999, left: story ? -300 : -180, bottom: story ? 180 : -220, border: `2px solid ${cosmeticAccent}`, opacity: 0.16 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><div style={{ display: 'flex', width: 18, height: 18, borderRadius: 999, background: cosmeticAccent }} /><span style={{ fontSize: story ? 26 : 20, fontWeight: 900, letterSpacing: 3 }}>PLAYMECHI</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: story ? 22 : 16, fontWeight: 800, color: '#ffffff99', letterSpacing: 2 }}>GAMER PASSPORT</span><span style={{ marginTop: 5, fontSize: story ? 13 : 9, color: cosmeticAccent, fontWeight: 900, letterSpacing: 1.5 }}>COSMETIC STYLE · {cardStyle?.label ?? 'Core Card'}</span></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 120 : 10 }}>
        <span style={{ fontSize: story ? 32 : square ? 26 : 21, color: cosmeticAccent, fontWeight: 900 }}>@{identity.username}</span>
        <span style={{ marginTop: 12, fontSize: story ? 86 : square ? 68 : 52, lineHeight: 1, fontWeight: 950, letterSpacing: -3 }}>{identity.display_name}</span>
        {identity.archetypes.length > 0 ? <div style={{ display: 'flex', marginTop: story ? 28 : 20, gap: 12 }}>{identity.archetypes.slice(0, 3).map((archetype) => <span key={archetype} style={{ display: 'flex', padding: story ? '12px 18px' : '9px 14px', borderRadius: 999, border: '1px solid #ffffff24', background: '#ffffff0d', fontSize: story ? 22 : 15, fontWeight: 800 }}>{archetype.replaceAll('_', ' ')}</span>)}</div> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: story ? 'column' : 'row', gap: story ? 22 : 16, width: '100%', marginTop: story ? 100 : 28 }}>
        {games.length > 0 ? games.map((entry, index) => <div key={entry.id} style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: story ? 'row' : 'column', alignItems: story ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12, borderRadius: story ? 28 : 20, border: '1px solid #ffffff1f', background: index === 0 ? `${identity.card_accent}20` : '#ffffff0b', padding: story ? '26px 30px' : '18px 20px' }}><div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: story ? 30 : square ? 20 : 18, lineHeight: 1.15, fontWeight: 900 }}>{entry.game.title}</span><span style={{ marginTop: 9, fontSize: story ? 20 : 13, fontWeight: 700, color: '#ffffff88' }}>{PASSPORT_GAME_STATUS_LABELS[entry.play_status]}{entry.rating ? ` · ${entry.rating}/10` : ''}</span></div>{entry.is_featured ? <span style={{ fontSize: story ? 18 : 12, color: identity.card_accent, fontWeight: 900, letterSpacing: 1 }}>FEATURED</span> : null}</div>) : <div style={{ display: 'flex', width: '100%', borderRadius: 24, border: '1px solid #ffffff1f', background: '#ffffff0b', padding: 28, fontSize: story ? 30 : 20, color: '#ffffff99' }}>Building a gaming legacy on Mechi.</div>}
      </div>

      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: story ? 110 : 28 }}>
        <div style={{ display: 'flex', gap: story ? 44 : 28 }}><CardMetric value={library.stats.total} label="GAMES" large={story} /><CardMetric value={library.stats.completed} label="COMPLETED" large={story} /><CardMetric value={summary?.total_matches ?? 0} label="MATCHES" large={story} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ fontSize: story ? 24 : 17, fontWeight: 900 }}>mechi.club/@{identity.username}</span><span style={{ marginTop: 6, fontSize: story ? 18 : 12, color: '#ffffff66' }}>Compete. Connect. Build your legacy.</span></div>
      </div>
    </div>,
    { ...size }
  );
  response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline';
  response.headers.set('Content-Disposition', `${disposition}; filename="${identity.username}-gamer-card-${format}.png"`);
  return response;
}

function CardMetric({ value, label, large }: { value: number; label: string; large: boolean }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: large ? 46 : 30, fontWeight: 950 }}>{value}</span><span style={{ marginTop: 4, fontSize: large ? 16 : 10, color: '#ffffff66', fontWeight: 900, letterSpacing: 1.5 }}>{label}</span></div>;
}
