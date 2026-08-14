import React from 'react';
import { ImageResponse } from 'next/og';
import type { PassportCardModel } from '@/lib/passport-card-model';
import { readPassportCardPngDimensions } from '@/lib/passport-card-png';

export async function renderPassportCardPng(model: PassportCardModel): Promise<Uint8Array> {
  const story = model.format === 'story';
  const square = model.format === 'square';
  const response = new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', flexDirection: 'column', justifyContent: 'space-between', backgroundImage: `linear-gradient(145deg, ${model.background} 0%, ${model.surface} 62%, ${model.accentSoft} 100%)`, color: '#FFFFFF', padding: story ? 76 : square ? 62 : 48 }}>
      <div style={{ display: 'flex', position: 'absolute', width: story ? 720 : 480, height: story ? 720 : 480, borderRadius: model.pattern === 'signal' ? 40 : 9999, right: story ? -280 : -160, top: story ? -180 : -210, backgroundColor: model.accent, opacity: model.pattern === 'aurora' ? 0.2 : 0.12, ...(model.pattern === 'signal' ? { transform: 'rotate(22deg)' } : {}) }} />
      <div style={{ display: 'flex', position: 'absolute', width: story ? 560 : 360, height: story ? 560 : 360, borderRadius: 9999, left: story ? -300 : -180, bottom: story ? 180 : -220, border: `2px solid ${model.accent}`, opacity: 0.16 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', width: 18, height: 18, borderRadius: 999, backgroundColor: model.accent }} />
          <span style={{ fontSize: story ? 26 : 20, fontWeight: 900, letterSpacing: 3 }}>PLAYMECHI</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: story ? 22 : 16, fontWeight: 800, color: '#FFFFFF99', letterSpacing: 2 }}>GAMER PASSPORT</span>
          <span style={{ marginTop: 5, fontSize: story ? 13 : 9, color: model.accent, fontWeight: 900, letterSpacing: 1.5 }}>{`COSMETIC STYLE · ${model.styleLabel}`}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 120 : 10 }}>
        <span style={{ fontSize: story ? 32 : square ? 26 : 21, color: model.accent, fontWeight: 900 }}>{`@${model.handle}`}</span>
        <span style={{ marginTop: 12, fontSize: story ? 86 : square ? 68 : 52, lineHeight: 1, fontWeight: 900, letterSpacing: -3 }}>{model.displayName}</span>
        {model.archetypes.length > 0 ? (
          <div style={{ display: 'flex', marginTop: story ? 28 : 20, gap: 12 }}>
            {model.archetypes.map((archetype) => (
              <span key={archetype} style={{ display: 'flex', padding: story ? '12px 18px' : '9px 14px', borderRadius: 999, border: '1px solid #FFFFFF24', backgroundColor: '#FFFFFF0D', fontSize: story ? 22 : 15, fontWeight: 800 }}>{archetype}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: story ? 'column' : 'row', gap: story ? 22 : 16, width: '100%', marginTop: story ? 100 : 28 }}>
        {model.games.length > 0 ? model.games.map((game, index) => (
          <div key={game.id} style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: story ? 'row' : 'column', alignItems: story ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12, borderRadius: story ? 28 : 20, border: '1px solid #FFFFFF1F', backgroundColor: index === 0 ? model.accentSoft : '#FFFFFF0B', padding: story ? '26px 30px' : '18px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: story ? 30 : square ? 20 : 18, lineHeight: 1.15, fontWeight: 900 }}>{game.title}</span>
              <span style={{ marginTop: 9, fontSize: story ? 20 : 13, fontWeight: 700, color: '#FFFFFF88' }}>{game.rating === null ? game.status : `${game.status} · ${game.rating}/10`}</span>
            </div>
            {game.featured ? <span style={{ fontSize: story ? 18 : 12, color: model.accent, fontWeight: 900, letterSpacing: 1 }}>FEATURED</span> : null}
          </div>
        )) : (
          <div style={{ display: 'flex', width: '100%', borderRadius: 24, border: '1px solid #FFFFFF1F', backgroundColor: '#FFFFFF0B', padding: 28, fontSize: story ? 30 : 20, color: '#FFFFFF99' }}>Building a gaming legacy on Mechi.</div>
        )}
      </div>

      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: story ? 110 : 28 }}>
        <div style={{ display: 'flex', gap: story ? 44 : 28 }}>
          <CardMetric value={model.metrics.games} label="GAMES" large={story} />
          <CardMetric value={model.metrics.completed} label="COMPLETED" large={story} />
          <CardMetric value={model.metrics.matches} label="MATCHES" large={story} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: story ? 24 : 17, fontWeight: 900 }}>{`mechi.club/@${model.handle}`}</span>
          <span style={{ marginTop: 6, fontSize: story ? 18 : 12, color: '#FFFFFF66' }}>Compete. Connect. Build your legacy.</span>
        </div>
      </div>
    </div>,
    { ...model.size, emoji: 'twemoji' }
  );
  const png = new Uint8Array(await response.arrayBuffer());
  const dimensions = readPassportCardPngDimensions(png);
  if (!dimensions || dimensions.width !== model.size.width || dimensions.height !== model.size.height) {
    throw new Error('PASSPORT_CARD_INVALID_PNG');
  }
  return png;
}

function CardMetric({ value, label, large }: { value: number; label: string; large: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: large ? 46 : 30, fontWeight: 900 }}>{String(value)}</span>
      <span style={{ marginTop: 4, fontSize: large ? 16 : 10, color: '#FFFFFF66', fontWeight: 900, letterSpacing: 1.5 }}>{label}</span>
    </div>
  );
}
