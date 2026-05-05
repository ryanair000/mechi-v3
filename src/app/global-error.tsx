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
          background: '#070a08',
          color: '#f8fbfd',
          fontFamily: 'var(--font-open-sans), sans-serif',
        }}
      >
        <main
          style={{
            width: 'min(92vw, 560px)',
            padding: '32px 24px',
            borderRadius: 24,
            background: 'rgba(21, 32, 51, 0.92)',
            border: '1px solid rgba(226, 232, 240, 0.12)',
            boxShadow: '0 28px 60px rgba(0, 0, 0, 0.35)',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, letterSpacing: 0.2, color: '#32E0C4' }}>Mechi</p>
          <h1 style={{ margin: '12px 0 10px', fontSize: 28, lineHeight: 1.15 }}>
            Something went wrong.
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(248, 251, 253, 0.78)' }}>
            We logged the error for review. Try the page again, and if it keeps failing we can trace it from
            Sentry.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: '12px 18px',
              borderRadius: 999,
              border: 0,
              background: '#32E0C4',
              color: '#0b1121',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
