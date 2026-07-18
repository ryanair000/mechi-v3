'use client';

import type { ReactNode } from 'react';
import { V5AuthShell } from '@/components/v5/auth/V5AuthShell';

type SignupPageVariant = 'default' | 'marketing';
type SideContentPlacement = 'default' | 'bottom';

interface SignupPageProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  sideEyebrow?: string;
  sideTitle?: string;
  sideDescription?: string;
  sidePoints?: string[];
  backHref?: string;
  imageSrc?: string;
  imageAlt?: string;
  variant?: SignupPageVariant;
  hideMainHeader?: boolean;
  hideSideEyebrow?: boolean;
  sideContentPlacement?: SideContentPlacement;
}

export function SignupPage({
  children,
  title,
  subtitle,
  sideEyebrow,
  sideTitle,
  sideDescription,
  sidePoints,
  backHref = '/',
  hideMainHeader = false,
  hideSideEyebrow = false,
}: SignupPageProps) {
  return (
    <V5AuthShell
      title={title}
      subtitle={subtitle}
      sideEyebrow={sideEyebrow}
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      sidePoints={sidePoints}
      backHref={backHref}
      hideMainHeader={hideMainHeader}
      hideSideEyebrow={hideSideEyebrow}
    >
      {children}
    </V5AuthShell>
  );
}
