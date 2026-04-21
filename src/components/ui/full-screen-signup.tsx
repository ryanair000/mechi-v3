'use client';

import type { ReactNode } from 'react';
import { SignupPage } from '@/components/ui/sign-up-page';

interface FullScreenSignupProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  sideTitle: string;
  sideDescription: string;
  sidePoints?: string[];
}

export function FullScreenSignup({
  children,
  title,
  subtitle,
  sideTitle,
  sideDescription,
  sidePoints = [],
}: FullScreenSignupProps) {
  return (
    <SignupPage
      title={title}
      subtitle={subtitle}
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      sidePoints={sidePoints}
    >
      {children}
    </SignupPage>
  );
}
