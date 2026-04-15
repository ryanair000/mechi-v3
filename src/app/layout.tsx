import type { Metadata, Viewport } from 'next';
import { Geist, Montserrat, Open_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';
import { cn } from '@/lib/utils';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mechi.club'),
  title: 'Mechi | Compete. Connect. Rise.',
  description:
    'Mechi is the competitive gaming platform for Kenyan players who want organized 1v1s, clean matchmaking, and a better way to rise.',
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
      'Organized 1v1 matchmaking for Kenyan players across football, fighters, sports, and mobile competition.',
    url: 'https://mechi.club',
    siteName: 'Mechi',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mechi | Compete. Connect. Rise.',
    description:
      'Organized 1v1 matchmaking for Kenyan players who want better competition and cleaner progression.',
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
    <html
      lang="en"
      className={cn(montserrat.variable, openSans.variable, geist.variable, 'font-sans')}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
