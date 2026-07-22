'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getPostHogPersonProperties,
  getPostHogBrowserClient,
  getSafeAnalyticsPath,
  POSTHOG_ENABLED,
} from '@/lib/posthog';

export function PostHogAnalyticsBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loading, user } = useAuth();
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_ENABLED || !pathname) {
      return;
    }

    const path = getSafeAnalyticsPath(pathname, searchParams);

    let cancelled = false;
    void getPostHogBrowserClient().then((posthog) => {
      if (!posthog || cancelled) return;
      posthog.capture('$pageview', {
        $current_url: `${window.location.origin}${path}`,
        page_path: path,
        page_title: document.title,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!POSTHOG_ENABLED || loading) {
      return;
    }

    let cancelled = false;
    void getPostHogBrowserClient().then((posthog) => {
      if (!posthog || cancelled) return;

      if (!user) {
        if (identifiedUserIdRef.current) {
          posthog.reset();
          identifiedUserIdRef.current = null;
        }
        return;
      }

      if (identifiedUserIdRef.current === user.id) return;

      posthog.identify(user.id, getPostHogPersonProperties(user));
      identifiedUserIdRef.current = user.id;
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  return null;
}
