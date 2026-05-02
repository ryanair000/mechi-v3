import { Suspense } from 'react';
import { PasswordResetFlow } from '@/components/auth/PasswordResetFlow';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type ResetPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: ResetPasswordSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const rawTokenValue = resolvedSearchParams.token;
  const token =
    typeof rawTokenValue === 'string'
      ? rawTokenValue
      : Array.isArray(rawTokenValue)
        ? rawTokenValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext);
  const loginHref = getLoginPath(rawNext ? nextPath : null);

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideEyebrow="mechi.club"
      sideTitle="Reset your password."
      sideDescription="Match your username and email, set a fresh password, and jump back in."
      sidePoints={[
        'Username and email match',
        'No email link needed',
        'Set a new password securely',
      ]}
      hideMainHeader
      variant="marketing"
    >
      <Suspense fallback={null}>
        <PasswordResetFlow loginHref={loginHref} nextPath={nextPath} token={token} />
      </Suspense>
    </FullScreenSignup>
  );
}
