'use client';

import { use } from 'react';
import { PasswordResetFlow } from '@/components/auth/PasswordResetFlow';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type ForgotPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: ForgotPasswordSearchParams;
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
      title="Reset your password."
      subtitle="Enter your username and email, then choose a new password right here."
      sideTitle="Get back in quickly."
      sideDescription="Confirm the username and email on your Mechi profile, then set a fresh password without waiting for an email."
      sidePoints={[
        'Confirm username + email first',
        'Set your new password on the next step',
        'Immediate sign-in after reset',
      ]}
    >
      <PasswordResetFlow loginHref={loginHref} nextPath={nextPath} />
    </FullScreenSignup>
  );
}
