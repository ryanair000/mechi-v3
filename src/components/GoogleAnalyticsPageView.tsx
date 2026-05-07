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

const SENSITIVE_QUERY_PARAMS = new Set(['token', 'code', 'state']);

function getAnalyticsPath(pathname: string, searchParams: { toString(): string }) {
  const safeParams = new URLSearchParams(searchParams.toString());

  for (const key of SENSITIVE_QUERY_PARAMS) {
    safeParams.delete(key);
  }

  const query = safeParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

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

    sendPageView(measurementId, getAnalyticsPath(pathname, searchParams));
  }, [measurementId, pathname, searchParams]);

  return null;
}
