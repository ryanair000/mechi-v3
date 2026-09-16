import type { Metadata, Viewport } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';
import { GoogleAnalyticsPageView } from '@/components/GoogleAnalyticsPageView';
import { PostHogAnalyticsBridge } from '@/components/PostHogAnalyticsBridge';
import {
  GOOGLE_ANALYTICS_ID,
  getGoogleAnalyticsConfigScript,
} from '@/lib/analytics';
import { APP_URL } from '@/lib/urls';
import { getRequestRegionalSettings } from '@/lib/regional-settings-server';
import {
  DARK_THEME_COLOR,
  DEFAULT_THEME,
  LIGHT_THEME_COLOR,
  STORAGE_KEY,
} from '@/lib/theme';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const regionalSettings = await getRequestRegionalSettings();
  const isSwahili = regionalSettings.locale === 'sw-TZ';

  return {
    metadataBase: new URL('https://mechi.club'),
    manifest: '/manifest.webmanifest',
    title: 'Mechi | Find competition. Play. Build your record.',
    description: isSwahili
      ? 'Mechi inakusaidia kupata mashindano ya gaming, kucheza mechi zilizothibitishwa, na kujenga rekodi yako ya ushindani.'
      : 'Find gaming tournaments, play verified matches, and build a competitive record on Mechi.',
    keywords: [
      'mechi',
      'playmechi',
      'gaming',
      'tournaments',
      'east africa',
      'kenya',
      'tanzania',
      'uganda',
      'esports',
      '1v1',
      'competitive gaming',
      'efootball',
      'ea fc',
      'tekken',
    ],
    openGraph: {
      title: 'Mechi | Find competition. Play. Build your record.',
      description: isSwahili
        ? 'Pata mashindano ya gaming, cheza mechi zilizothibitishwa, na jenga rekodi yako ya ushindani kwenye Mechi.'
        : 'Find gaming tournaments, play verified matches, and build a competitive record on Mechi.',
      url: 'https://mechi.club',
      siteName: 'Mechi',
      locale: regionalSettings.locale === 'sw-TZ' ? 'sw_TZ' : 'en_KE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Mechi | Find competition. Play. Build your record.',
      description: isSwahili
        ? 'Pata mashindano, cheza mechi zilizothibitishwa, na jenga rekodi yako ya gaming kwenye Mechi.'
        : 'Find competition, play verified matches, and build your gaming record on Mechi.',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: DARK_THEME_COLOR,
  colorScheme: DEFAULT_THEME,
};

const themeScript = `
  (() => {
    try {
      const root = document.documentElement;
      const storedTheme = localStorage.getItem('${STORAGE_KEY}');
      const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : '${DEFAULT_THEME}';
      const themeColor = theme === 'dark' ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}';
      root.classList.toggle('dark', theme === 'dark');
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', themeColor);
      const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
      if (colorSchemeMeta) colorSchemeMeta.setAttribute('content', theme);
    } catch {}
  })();
`;

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Mechi',
  url: APP_URL,
  logo: `${APP_URL}/icon.png`,
  sameAs: [
    'https://www.instagram.com/playmechi',
    'https://www.facebook.com/playmechi',
    'https://www.x.com/playmechi',
    'https://www.youtube.com/@playmechi',
    'https://www.twitch.tv/playmechi',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mechi',
  url: APP_URL,
  publisher: {
    '@type': 'Organization',
    name: 'Mechi',
  },
};

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const regionalSettings = await getRequestRegionalSettings();

  return (
    <html
      lang={regionalSettings.htmlLang}
      className={`${montserrat.variable} ${openSans.variable} font-sans dark`}
      data-theme={DEFAULT_THEME}
      style={{ colorScheme: DEFAULT_THEME }}
      suppressHydrationWarning
    >
      <head>
        <Script id="playmechi-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }}
        />
      </head>
      <body>
        <AppProviders initialRegionalSettings={regionalSettings}>{children}</AppProviders>
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView measurementId={GOOGLE_ANALYTICS_ID} />
        </Suspense>
        <Suspense fallback={null}>
          <PostHogAnalyticsBridge />
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
