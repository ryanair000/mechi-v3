import { normalizeEnvValue } from '@/lib/db-compat';

export const GOOGLE_ANALYTICS_ID =
  normalizeEnvValue(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) || 'G-KVY9G79JK1';

export function getGoogleAnalyticsConfigScript(gaId: string) {
  const measurementId = JSON.stringify(gaId);

  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ${measurementId}, { send_page_view: false });
  `;
}
