'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, AtSign, CheckCircle2, Send } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';

type TestResult = {
  success?: boolean;
  error?: string;
  result?: {
    ok: boolean;
    status: number;
    error?: string;
    details?: string;
    messageId?: string | null;
    recipientId?: string | null;
  };
};

const DEFAULT_MESSAGE =
  'Mechi support here. This is an Instagram inbox test from the admin panel.';

export default function InstagramOpsClient() {
  const authFetch = useAuthFetch();
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const sendPreview = async () => {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await authFetch('/api/admin/instagram/test', {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: recipientId,
          message,
        }),
      });

      const data = (await response.json()) as TestResult;
      setResult(data);

      if (!response.ok || !data.success) {
        toast.error(
          data.result?.details ?? data.result?.error ?? data.error ?? 'Instagram test failed'
        );
        return;
      }

      toast.success('Instagram DM accepted');
    } catch {
      toast.error('Could not send Instagram preview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-kicker">Instagram Ops</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Test the Instagram DM lane before you rely on it live.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              This uses Meta&apos;s Instagram messaging API. The user must have messaged your
              Instagram professional account first, and the conversation must still be inside the
              24-hour reply window.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            Use the Instagram-scoped sender ID from a live support thread.
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <AtSign size={16} className="text-[var(--brand-coral)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Send test DM</p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Instagram recipient ID</label>
              <input
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                className="input"
                placeholder="1784..."
              />
            </div>

            <div>
              <label className="label">Message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="input min-h-36 resize-y py-3"
                placeholder="Type the DM you want to send..."
              />
            </div>

            <button
              type="button"
              onClick={sendPreview}
              disabled={submitting || !recipientId.trim() || !message.trim()}
              className="btn-primary"
            >
              <Send size={14} />
              {submitting ? 'Sending...' : 'Send Instagram test'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-[var(--brand-teal)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Last result</p>
          </div>

          {!result ? (
            <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              Send a test to inspect Meta&apos;s response, the final recipient ID, and any window or
              permission errors.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div
                className={`rounded-2xl border p-4 ${
                  result.success
                    ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.12)]'
                    : 'border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.1)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 size={16} className="text-[var(--brand-teal)]" />
                  ) : (
                    <AlertCircle size={16} className="text-[var(--brand-coral)]" />
                  )}
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {result.success ? 'Accepted by Meta' : 'Send failed'}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                  {result.result?.details ??
                    result.result?.error ??
                    result.error ??
                    'No extra details returned.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="label">Delivery details</p>
                <div className="mt-2 space-y-2 text-xs leading-6 text-[var(--text-secondary)]">
                  <p>Status: {result.result?.status ?? 0}</p>
                  <p>Recipient ID: {result.result?.recipientId || recipientId || 'n/a'}</p>
                  <p>Message ID: {result.result?.messageId ?? 'n/a'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
