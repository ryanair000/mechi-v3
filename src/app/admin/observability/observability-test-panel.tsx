'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';

type TestTarget = 'both' | 'sentry' | 'posthog';

type TestResult = {
  requestId: string;
  sentry: {
    attempted: boolean;
    ok: boolean;
    skipped: boolean;
  };
  posthog: {
    attempted: boolean;
    ok: boolean;
    skipped: boolean;
    error: string | null;
  };
  error?: string;
};

export function ObservabilityTestPanel() {
  const [pendingTarget, setPendingTarget] = useState<TestTarget | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  async function runTest(target: TestTarget) {
    setPendingTarget(target);
    setResult(null);

    try {
      const response = await fetch('/api/admin/observability/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = (await response.json()) as TestResult;

      if (!response.ok) {
        toast.error(data.error ?? 'Observability test failed');
        return;
      }

      setResult(data);
      toast.success('Observability test sent');
    } catch {
      toast.error('Network error while testing observability');
    } finally {
      setPendingTarget(null);
    }
  }

  const buttons: Array<{ target: TestTarget; label: string }> = [
    { target: 'both', label: 'Test both' },
    { target: 'sentry', label: 'Test Sentry' },
    { target: 'posthog', label: 'Test PostHog' },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="brand-kicker">Safe test event</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Send a controlled signal
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            This sends an admin-only Sentry message and/or a PostHog server event. It does not throw
            a production error and it does not expose tokens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {buttons.map((button) => (
            <button
              key={button.target}
              type="button"
              onClick={() => void runTest(button.target)}
              disabled={pendingTarget !== null}
              className="btn-outline min-h-10 px-3 py-2 text-xs"
            >
              {pendingTarget === button.target ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {button.label}
            </button>
          ))}
        </div>
      </div>

      {result ? (
        <div className="mt-4 rounded-md border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 font-mono text-xs text-[var(--text-secondary)]">
          <p>request_id: {result.requestId}</p>
          <p>
            sentry:{' '}
            {result.sentry.attempted
              ? result.sentry.skipped
                ? 'skipped, disabled in settings'
                : 'sent'
              : 'not requested'}
          </p>
          <p>
            posthog:{' '}
            {result.posthog.attempted
              ? result.posthog.skipped
                ? 'skipped, token missing'
                : result.posthog.ok
                  ? 'sent'
                  : `failed ${result.posthog.error ?? ''}`.trim()
              : 'not requested'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
