import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Mechi — Kenya Gaming Matchmaking',
    template: '%s | Mechi',
  },
  description: 'Find opponents, compete 1v1, climb the leaderboard. Kenya\'s premier gaming matchmaking platform.',
  keywords: ['gaming', 'kenya', 'matchmaking', 'esports', '1v1', 'eFootball', 'EA FC', 'Tekken'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-gray-950">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg, #1e293b)',
                  color: '#f1f5f9',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#059669', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
