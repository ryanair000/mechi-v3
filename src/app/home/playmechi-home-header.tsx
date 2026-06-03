'use client';

import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath } from '@/lib/navigation';

const PLAYMECHI_SIGN_IN_PATH = getLoginPath();

export function PlayMechiHomeHeader() {
  return (
    <HomeFloatingHeader
      signInHref={PLAYMECHI_SIGN_IN_PATH}
      showRegionalControls={false}
      compact
      showLogo
    />
  );
}
