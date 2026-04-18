'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

type GoogleAnalyticsPageViewProps = {
  measurementId: string;
};

function sendPageView(measurementId: string, path: string) {
  const pageLocation = `${window.location.origin}${path}`;
  const gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(args);
    });

  gtag('config', measurementId, {
    page_path: path,
    page_location: pageLocation,
    page_title: document.title,
  });
}

export function GoogleAnalyticsPageView({ measurementId }: GoogleAnalyticsPageViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || !pathname) return;

    const query = searchParams.toString();
    sendPageView(measurementId, query ? `${pathname}?${query}` : pathname);
  }, [measurementId, pathname, searchParams]);

  return null;
}
