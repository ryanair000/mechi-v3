'use client';

import type { ReactNode } from 'react';
import { SignupPage } from '@/components/ui/sign-up-page';

type FullScreenSignupVariant = 'default' | 'marketing';

interface FullScreenSignupProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  sideTitle: string;
  sideDescription: string;
  sidePoints?: string[];
  variant?: FullScreenSignupVariant;
}

export function FullScreenSignup({
  children,
  title,
  subtitle,
  sideTitle,
  sideDescription,
  sidePoints = [],
  variant = 'default',
}: FullScreenSignupProps) {
  return (
    <SignupPage
      title={title}
      subtitle={subtitle}
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      sidePoints={sidePoints}
      variant={variant}
    >
      {children}
    </SignupPage>
  );
}
