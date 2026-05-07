import { getTier } from '@/lib/config';

interface TierMedalProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const SIZE_MAP = {
  sm: { orb: 28, core: 12, label: 'text-[10px]' },
  md: { orb: 40, core: 16, label: 'text-[11px]' },
  lg: { orb: 56, core: 22, label: 'text-xs' },
} as const;

const TIER_STYLES: Record<string, { color: string; glow: string; accent: string }> = {
  Bronze: { color: '#CD7F32', glow: 'rgba(205,127,50,0.34)', accent: '#F4B57D' },
  Silver: { color: '#C0C0C0', glow: 'rgba(192,192,192,0.34)', accent: '#F5F5F5' },
  Gold: { color: '#FFD700', glow: 'rgba(255,215,0,0.34)', accent: '#FFF3A3' },
  Platinum: { color: '#00CED1', glow: 'rgba(0,206,209,0.34)', accent: '#A7F3F0' },
  Diamond: { color: '#60A5FA', glow: 'rgba(96,165,250,0.34)', accent: '#DBEAFE' },
  Legend: { color: '#A855F7', glow: 'rgba(168,85,247,0.34)', accent: '#F5D0FE' },
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
          borderColor: `${style.color}55`,
          background: `radial-gradient(circle at 35% 30%, ${style.accent}, ${style.color} 68%)`,
          boxShadow: `0 0 ${size === 'lg' ? 18 : 9}px ${style.glow}`,
        }}
        className="relative inline-flex items-center justify-center rounded-full border"
      >
        <span
          style={{
            width: `${sizing.core}px`,
            height: `${sizing.core}px`,
            background: 'rgba(255,255,255,0.24)',
            boxShadow: `0 0 0 1px ${style.accent}55`,
          }}
          className="rounded-full"
        />
        <span
          style={{
            width: `${Math.max(4, Math.round(sizing.core / 3))}px`,
            height: `${Math.max(4, Math.round(sizing.core / 3))}px`,
            background: style.accent,
            top: `${Math.max(4, Math.round(sizing.orb / 6))}px`,
            right: `${Math.max(4, Math.round(sizing.orb / 6))}px`,
          }}
          className="absolute rounded-full"
        />
      </span>
      {showName ? (
        <span className={`${sizing.label} font-semibold`} style={{ color: style.color }}>
          {tier.name}
        </span>
      ) : null}
    </span>
  );
}
