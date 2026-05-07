'use client';

import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getPostHogPersonProperties,
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

    posthog.capture('$pageview', {
      $current_url: `${window.location.origin}${path}`,
      page_path: path,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!POSTHOG_ENABLED || loading) {
      return;
    }

    if (!user) {
      if (identifiedUserIdRef.current) {
        posthog.reset();
        identifiedUserIdRef.current = null;
      }
      return;
    }

    if (identifiedUserIdRef.current === user.id) {
      return;
    }

    posthog.identify(user.id, getPostHogPersonProperties(user));
    identifiedUserIdRef.current = user.id;
  }, [loading, user]);

  return null;
}
