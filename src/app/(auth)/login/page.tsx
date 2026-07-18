'use client';

import { use } from 'react';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { isPrimaryAdminHost } from '@/lib/admin-access';
import { getRegisterPath, getSafeNextPath } from '@/lib/navigation';
import { AuthLoginScreen } from '@/components/auth/AuthLoginScreen';

type LoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const { locale } = useRegionalSettings();
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
      : '/app/player';
  const nextPath = getSafeNextPath(rawNext, hostFallbackPath);
  const registerHref = getRegisterPath({ next: rawNext ? nextPath : null });
  const isSwahili = locale === 'sw-TZ';

  return (
    <AuthLoginScreen
      nextPath={nextPath}
      footerHref={registerHref}
      footerLinkLabel={isSwahili ? 'Tengeneza akaunti yako' : 'Create your account'}
      footerPrompt={isSwahili ? 'Mgeni PlayMechi?' : 'New to PlayMechi?'}
      sideTitle={isSwahili ? 'Ingia tena.' : 'Sign back in.'}
      sideDescription={
        isSwahili
          ? 'Profile yako, historia ya mechi, na mpangilio wako bado vinakusubiri.'
          : 'Your profile, match history, and active setup are still waiting for you.'
      }
    />
  );
}
