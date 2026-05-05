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
      subtitle="Enter your username and email, then open the secure reset link we send."
      sideTitle="Get back in safely."
      sideDescription="Match the username and email on your Mechi profile, then use the emailed link to set a fresh password."
      sidePoints={[
        'Username and email match',
        'Secure email reset link',
        'Immediate sign-in after reset',
      ]}
    >
      <Suspense fallback={null}>
        <PasswordResetFlow loginHref={loginHref} nextPath={nextPath} />
      </Suspense>
    </FullScreenSignup>
  );
}
