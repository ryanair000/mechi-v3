import { Suspense } from 'react';
import { PasswordResetFlow } from '@/components/auth/PasswordResetFlow';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type ForgotPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: ForgotPasswordSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
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
      subtitle="Enter your account email and we will send a one-time reset link."
      sideTitle="Get back in safely."
      sideDescription="Password changes now use secure email links so account recovery cannot be triggered by profile details alone."
      sidePoints={[
        'One-time email reset link',
        'Set a new password securely',
        'Immediate sign-in after reset',
      ]}
    >
      <Suspense fallback={null}>
        <PasswordResetFlow loginHref={loginHref} nextPath={nextPath} />
      </Suspense>
    </FullScreenSignup>
  );
}
