'use client';

import { use } from 'react';
import { isPrimaryAdminHost } from '@/lib/admin-access';
import { getRegisterPath, getSafeNextPath } from '@/lib/navigation';
import { AuthLoginScreen } from '@/components/auth/AuthLoginScreen';

type LoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const hostFallbackPath =
    typeof window !== 'undefined' && isPrimaryAdminHost(window.location.host)
      ? '/admin'
      : '/dashboard';
  const nextPath = getSafeNextPath(rawNext, hostFallbackPath);
  const registerHref = getRegisterPath({ next: rawNext ? nextPath : null });

  return (
    <AuthLoginScreen
      nextPath={nextPath}
      footerHref={registerHref}
      footerLinkLabel="Create your account"
      footerPrompt="New to Mechi?"
      sideTitle="Sign back in."
      sideDescription="Your profile, match history, and active setup are still waiting for you."
    />
  );
}
