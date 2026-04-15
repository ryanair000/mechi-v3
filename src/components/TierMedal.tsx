import { getTier } from '@/lib/config';

interface TierMedalProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const SIZE_MAP = {
  sm: { orb: 28, font: 11, label: 'text-[10px]' },
  md: { orb: 40, font: 14, label: 'text-[11px]' },
  lg: { orb: 56, font: 18, label: 'text-xs' },
} as const;

const TIER_STYLES: Record<string, { color: string; glow: string; symbol: string }> = {
  Bronze: { color: '#CD7F32', glow: 'rgba(205,127,50,0.35)', symbol: 'B' },
  Silver: { color: '#C0C0C0', glow: 'rgba(192,192,192,0.35)', symbol: 'S' },
  Gold: { color: '#FFD700', glow: 'rgba(255,215,0,0.35)', symbol: 'G' },
  Platinum: { color: '#00CED1', glow: 'rgba(0,206,209,0.35)', symbol: 'P' },
  Diamond: { color: '#60A5FA', glow: 'rgba(96,165,250,0.35)', symbol: 'D' },
  Legend: { color: '#FF6B6B', glow: 'rgba(255,107,107,0.35)', symbol: 'L' },
};

export function TierMedal({ rating, size = 'md', showName = false }: TierMedalProps) {
  const tier = getTier(rating);
  const sizing = SIZE_MAP[size];
  const style = TIER_STYLES[tier.name] ?? TIER_STYLES.Bronze;

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span
        style={{
          width: `${sizing.orb}px`,
          height: `${sizing.orb}px`,
          color: style.color,
          borderColor: `${style.color}55`,
          background: `${style.color}22`,
          boxShadow: `0 0 ${size === 'lg' ? 18 : 9}px ${style.glow}`,
          fontSize: `${sizing.font}px`,
        }}
        className="inline-flex items-center justify-center rounded-full border font-black tracking-[0.06em]"
      >
        {style.symbol}
      </span>
      {showName ? (
        <span className={`${sizing.label} font-semibold`} style={{ color: style.color }}>
          {tier.name}
        </span>
      ) : null}
    </span>
  );
}
