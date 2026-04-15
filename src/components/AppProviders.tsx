'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/AuthProvider';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: isDark ? '#152033' : '#ffffff',
          color: isDark ? '#f8fbfd' : '#0b1121',
          border: isDark
            ? '1px solid rgba(226,232,240,0.1)'
            : '1px solid rgba(11,17,33,0.1)',
          borderRadius: '18px',
          boxShadow: isDark
            ? '0 18px 48px rgba(0,0,0,0.34)'
            : '0 18px 48px rgba(11,17,33,0.12)',
          fontSize: '14px',
          fontWeight: '600',
        },
        success: { iconTheme: { primary: '#32E0C4', secondary: '#0B1121' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
