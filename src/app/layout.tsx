import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Mechi — Kenya Gaming Matchmaking',
  description: 'Find your opponent. Prove you\'re the best. 1v1 matchmaking for Kenyan gamers across PlayStation, Xbox, PC, Mobile & Nintendo.',
  keywords: ['gaming', 'matchmaking', 'kenya', 'esports', 'efootball', 'ea fc', 'tekken', '1v1'],
  openGraph: {
    title: 'Mechi — Kenya Gaming Matchmaking',
    description: '1v1 matchmaking for Kenyan gamers. Climb the ELO ladder.',
    url: 'https://mechi-v3.vercel.app',
    siteName: 'Mechi',
    locale: 'en_KE',
    type: 'website',
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
