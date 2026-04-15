import type { ComponentType } from 'react';
import type { PlatformKey } from '@/types';

interface PlatformLogoProps {
  platform: PlatformKey;
  size?: number;
  className?: string;
}

function PlayStationLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.996.636.199.762.866.762 1.555v5.502c2.319 1.338 4.063-.044 4.063-3.005 0-3.05-1.045-4.373-4.109-5.425-1.036-.35-3.437-1.077-5.425-1.723zM0 17.82c0 1.763 1.278 2.297 2.802 1.789l3.598-1.384v-2.04l-2.624.993c-.677.257-1.168.139-1.168-.529V14.06L0 14.703V17.82zm15.668 1.123c1.9.738 4.332.2 4.332-1.87 0-1.955-1.437-2.641-3.615-3.404l-.717-.24v2.071l.571.211c.726.265.87.507.87.847 0 .483-.467.627-1.196.36l-2.866-1.049-.001 2.053 2.622.97v.001zm3.552-9.607C18.094 7.31 16.04 6.576 13.5 5.89v2.109c1.833.49 3.055.99 3.055 2.235 0 .808-.643 1.21-1.566 1.006V13.3c2.29.334 4.23-.463 4.23-3.188v-.576z"
        fill="#003087"
      />
    </svg>
  );
}

function XboxLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.174 3.861C6.928 2.309 9.35 1.358 12 1.358s5.072.951 6.826 2.503C17.347 2.4 15.008 1.5 12.44 3.27c-.655.463-1.24 1.01-1.773 1.6-.227.25-.44.512-.643.784-.204-.272-.416-.534-.643-.784C8.85 4.28 8.266 3.733 7.61 3.27 5.044 1.5 2.705 2.4 1.226 3.861h-.052zM1.175 3.862C-.357 5.644-.316 8.564 1.18 11.3c.575-2.31 1.852-4.407 3.605-5.967-.748-.665-2.104-1.395-3.61-1.47zm21.65 0c-1.505.076-2.86.806-3.61 1.47 1.753 1.56 3.03 3.657 3.605 5.968 1.497-2.737 1.538-5.658.005-7.438zM5.958 6.32C4.095 8.002 3.016 10.46 3.016 12c0 4.971 4.014 8.998 8.984 9 4.97-.002 8.984-4.029 8.984-9 0-1.54-1.079-3.998-2.942-5.68C16.598 4.88 14.447 3.87 12 3.87S7.402 4.88 5.958 6.32z"
        fill="#107C10"
      />
    </svg>
  );
}

function NintendoLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.45 3h5.1C19.74 3 24 7.26 24 12.45v-.9C24 16.74 19.74 21 14.55 21h-5.1C4.26 21 0 16.74 0 11.55v.9C0 7.26 4.26 3 9.45 3zM7.5 7.5v9h2.25l4.5-5.625V16.5h2.25v-9h-2.25l-4.5 5.625V7.5H7.5z"
        fill="#E4000F"
      />
    </svg>
  );
}

function PCLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M0 0l11.5 1.58V11.5H0V0zm12.5 1.72L24 0v11.5H12.5V1.72zM11.5 13H0v10.45l11.5 1.577V13zM24 13H12.5v11.878L24 23.45V13z"
        fill="#00ADEF"
      />
    </svg>
  );
}

function MobileLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="14" height="22" rx="2.5" stroke="#A3E635" strokeWidth="2" />
      <circle cx="12" cy="19" r="1" fill="#A3E635" />
      <rect x="8" y="3" width="8" height="1.5" rx="0.75" fill="#A3E635" />
    </svg>
  );
}

const LOGOS: Record<PlatformKey, ComponentType<{ size: number }>> = {
  ps: PlayStationLogo,
  xbox: XboxLogo,
  nintendo: NintendoLogo,
  pc: PCLogo,
  mobile: MobileLogo,
};

export function PlatformLogo({ platform, size = 20, className = '' }: PlatformLogoProps) {
  const Logo = LOGOS[platform];
  if (!Logo) return null;

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Logo size={size} />
    </span>
  );
}
