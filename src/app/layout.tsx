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
    title: 'Mechi | Compete. Connect. Rise.',
    description: isSwahili
      ? 'Mechi inawasaidia gamers wa Afrika Mashariki kupata mechi safi za 1v1, lobbies zilizo sawa, na tournaments zenye zawadi bila vurugu za WhatsApp.'
      : 'Mechi helps East African players find proper 1v1s, clean lobbies, and prize-backed tournaments without the WhatsApp chaos.',
    keywords: [
      'mechi',
      'gaming',
      'matchmaking',
      'east africa',
      'kenya',
      'tanzania',
      'uganda',
      'rwanda',
      'ethiopia',
      'united states',
      'usa',
      'esports',
      '1v1',
      'competitive gaming',
      'efootball',
      'ea fc',
      'tekken',
    ],
    openGraph: {
      title: 'Mechi | Compete. Connect. Rise.',
      description: isSwahili
        ? 'Panga 1v1 safi, simamia lobbies vizuri, na endesha tournaments zenye zawadi kwa players wa Afrika Mashariki sehemu moja.'
        : 'Queue clean 1v1s, spin up proper lobbies, and run prize-backed tournaments for players across East Africa in one place.',
      url: 'https://mechi.club',
      siteName: 'Mechi',
      locale: regionalSettings.locale === 'sw-TZ' ? 'sw_TZ' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Mechi | Compete. Connect. Rise.',
      description: isSwahili
        ? 'Players wa Kenya, Tanzania, Uganda, Rwanda, na Ethiopia wanatumia Mechi kwa 1v1 safi, lobbies bora, na tournament zenye mpangilio mzuri.'
        : 'Players across Kenya, Tanzania, Uganda, Rwanda, and Ethiopia use Mechi for cleaner 1v1s, better lobbies, and smoother tournament runs.',
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
      const themeMetaTags = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
      const primaryThemeMeta = themeMetaTags[0] || document.createElement('meta');
      if (themeMetaTags.length === 0) {
        primaryThemeMeta.name = 'theme-color';
        document.head.appendChild(primaryThemeMeta);
      }
      primaryThemeMeta.setAttribute('content', themeColor);
      primaryThemeMeta.removeAttribute('media');
      themeMetaTags.slice(1).forEach((meta) => meta.remove());
      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
      if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement('meta');
        colorSchemeMeta.name = 'color-scheme';
        document.head.appendChild(colorSchemeMeta);
      }
      colorSchemeMeta.setAttribute('content', theme);
    } catch {}
  })();
`;

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
        <Script id="mechi-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
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
