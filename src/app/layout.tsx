import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://mechi.club'),
  title: 'Mechi - Kenya Gaming Matchmaking',
  description:
    'Organized 1v1 matchmaking for Kenyan gamers who want cleaner queues, fair results, and a real climb.',
  keywords: ['gaming', 'matchmaking', 'kenya', 'esports', 'efootball', 'ea fc', 'tekken', '1v1'],
  openGraph: {
    title: 'Mechi - Kenya Gaming Matchmaking',
    description:
      'Organized 1v1 matchmaking for Kenyan gamers. Queue up, lock results, and keep climbing.',
    url: 'https://mechi.club',
    siteName: 'Mechi',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Mechi - Kenya Gaming Matchmaking',
    description:
      'Organized 1v1 matchmaking for Kenyan gamers. Queue up, lock results, and keep climbing.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#030712',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '600',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
