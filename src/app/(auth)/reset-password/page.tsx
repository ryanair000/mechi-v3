'use client';

import { use } from 'react';
import { PasswordResetFlow } from '@/components/auth/PasswordResetFlow';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type ResetPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: ResetPasswordSearchParams;
}) {
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext);
  const loginHref = getLoginPath(rawNext ? nextPath : null);

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideEyebrow="mechi.club"
      sideTitle="Reset your password."
      sideDescription="Confirm the username and email on your Mechi profile, then set a fresh password and jump back in."
      sidePoints={[
        'Confirm username + email first',
        'Set your new password on the next step',
        'Immediate sign-in after reset',
      ]}
      hideMainHeader
      variant="marketing"
    >
      <PasswordResetFlow loginHref={loginHref} nextPath={nextPath} />
    </FullScreenSignup>
  );
}
