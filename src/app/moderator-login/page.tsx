'use client';

import { use } from 'react';
import { AuthLoginScreen } from '@/components/auth/AuthLoginScreen';
import { getSafeNextPath } from '@/lib/navigation';

type ModeratorLoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ModeratorLoginPage({
  searchParams,
}: {
  searchParams: ModeratorLoginSearchParams;
}) {
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext, '/moderators');

  return (
    <AuthLoginScreen
      nextPath={nextPath}
      footerHref="/moderator-signup"
      footerLinkLabel="Staff sign-up"
      footerPrompt="Need staff access?"
      sideTitle="Moderator desk sign in."
      sideDescription="Moderators and admins sign in here to run the CODM desk, review check-ins, and manage live lobby flow."
    />
  );
}
