'use client';

import type { ReactNode } from 'react';
import { SignupPage } from '@/components/ui/sign-up-page';

type FullScreenSignupVariant = 'default' | 'marketing';

interface FullScreenSignupProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  sideEyebrow?: string;
  sideTitle: string;
  sideDescription: string;
  sidePoints?: string[];
  variant?: FullScreenSignupVariant;
  hideMainHeader?: boolean;
}

export function FullScreenSignup({
  children,
  title,
  subtitle,
  sideEyebrow,
  sideTitle,
  sideDescription,
  sidePoints = [],
  variant = 'default',
  hideMainHeader = false,
}: FullScreenSignupProps) {
  return (
    <SignupPage
      title={title}
      subtitle={subtitle}
      sideEyebrow={sideEyebrow}
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      sidePoints={sidePoints}
      variant={variant}
      hideMainHeader={hideMainHeader}
    >
      {children}
    </SignupPage>
  );
}
