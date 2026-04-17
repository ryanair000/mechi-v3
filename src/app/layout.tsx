import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';
import { GoogleAnalyticsPageView } from '@/components/GoogleAnalyticsPageView';
import {
  GOOGLE_ANALYTICS_ID,
  getGoogleAnalyticsConfigScript,
} from '@/lib/analytics';

export const metadata: Metadata = {
  metadataBase: new URL('https://mechi.club'),
  title: 'Mechi | Compete. Connect. Rise.',
  description:
    'Mechi helps Kenyan players find proper 1v1s, clean lobbies, and prize-backed tournaments without the WhatsApp chaos.',
  keywords: [
    'mechi',
    'gaming',
    'matchmaking',
    'kenya',
    'esports',
    '1v1',
    'competitive gaming',
    'efootball',
    'ea fc',
    'tekken',
  ],
  openGraph: {
    title: 'Mechi | Compete. Connect. Rise.',
    description:
      'Queue clean 1v1s, spin up proper lobbies, and run prize-backed tournaments for Kenyan players in one place.',
    url: 'https://mechi.club',
    siteName: 'Mechi',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mechi | Compete. Connect. Rise.',
    description:
      'Kenyan players use Mechi to find cleaner 1v1s, better lobbies, and smoother tournament runs.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1121' },
  ],
};

const themeScript = `
  (() => {
    try {
      const root = document.documentElement;
      const storedTheme = localStorage.getItem('mechi-theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : systemTheme;
      root.classList.toggle('dark', theme === 'dark');
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    } catch {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView measurementId={GOOGLE_ANALYTICS_ID} />
        </Suspense>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics-config" strategy="afterInteractive">
          {getGoogleAnalyticsConfigScript(GOOGLE_ANALYTICS_ID)}
        </Script>
      </body>
    </html>
  );
}
