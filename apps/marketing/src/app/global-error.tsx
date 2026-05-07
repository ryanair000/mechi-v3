'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0E1626',
          color: '#f5f7fb',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main
          style={{
            width: 'min(92vw, 520px)',
            padding: '28px 24px',
            borderRadius: 20,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#7dd3fc' }}>Marketing Dashboard</p>
          <h1 style={{ margin: '12px 0 10px', fontSize: 26, lineHeight: 1.2 }}>
            The dashboard hit an unexpected error.
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(245, 247, 251, 0.78)' }}>
            The failure has been reported to Sentry. Reload the view to retry the request.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 18,
              padding: '11px 16px',
              borderRadius: 999,
              border: 0,
              background: '#f8fafc',
              color: '#0f172a',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
