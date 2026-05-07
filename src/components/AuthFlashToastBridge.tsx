'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

const AUTH_NOTICE_COPY: Record<string, { tone: 'success' | 'error'; message: string }> = {
  magic_link_success: {
    tone: 'success',
    message: 'Signed in with your username and email.',
  },
  magic_link_sent: {
    tone: 'success',
    message: 'Account matched. Signing you in now.',
  },
  reset_email_sent: {
    tone: 'success',
    message: 'Account matched. Choose a new password.',
  },
  password_reset_success: {
    tone: 'success',
    message: 'Password reset complete. You are signed in now.',
  },
  password_reset_invalid: {
    tone: 'error',
    message: 'That reset link is invalid or already used.',
  },
  password_reset_expired: {
    tone: 'error',
    message: 'That reset link expired. Request a fresh one.',
  },
  magic_link_invalid: {
    tone: 'error',
    message: 'That sign-in link is invalid or already used.',
  },
  magic_link_expired: {
    tone: 'error',
    message: 'That sign-in link expired. Request a fresh one.',
  },
};

export function AuthFlashToastBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastHandledKey = useRef<string | null>(null);
  const notice = searchParams.get('auth_notice');
  const authError = searchParams.get('auth_error');

  useEffect(() => {
    const code = notice ?? authError;
    if (!code) {
      return;
    }

    const entry =
      AUTH_NOTICE_COPY[code] ??
      (authError
        ? {
            tone: 'error' as const,
            message: authError,
          }
        : null);

    if (!entry) {
      return;
    }

    const key = `${pathname}?${searchParams.toString()}`;
    if (lastHandledKey.current === key) {
      return;
    }
    lastHandledKey.current = key;

    if (entry.tone === 'error') {
      toast.error(entry.message);
    } else {
      toast.success(entry.message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('auth_notice');
    nextParams.delete('auth_error');

    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [authError, notice, pathname, router, searchParams]);

  return null;
}
