'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Mail } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type ForgotPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: ForgotPasswordSearchParams;
}) {
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext);
  const loginHref = getLoginPath(rawNext ? nextPath : null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email.trim())) {
      toast.error('Enter a valid email address');
      setFeedback({
        tone: 'error',
        title: 'A valid email is required.',
        detail: 'Use the email connected to your Mechi account.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Sending your reset link...',
      detail: 'If the account exists, the email will land in your inbox shortly.',
    });

    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: nextPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'Could not send the reset link.',
          detail: data.error ?? 'Please try again in a moment.',
        });
        toast.error(data.error ?? 'Could not send reset link');
        return;
      }

      setFeedback({
        tone: 'success',
        title: 'Check your email.',
        detail: data.message ?? 'If the account exists, the reset link is on the way.',
      });
      toast.success(data.message ?? 'If that email exists, a reset link is on the way.');
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not send the reset link.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FullScreenSignup
      title="Reset your password."
      subtitle="Use your email to get a secure reset link."
      sideTitle="Get back in quickly."
      sideDescription="We will send a one-time link to the email on your Mechi account."
      sidePoints={[
        'Secure email reset flow',
        'Single-use reset links',
        'Immediate sign-in after reset',
      ]}
    >
      <div className="card p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@mail.com"
              className="input"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending link...
              </>
            ) : (
              <>
                <Mail size={14} />
                Email reset link
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Remembered it?{' '}
          <Link href={loginHref} className="brand-link-coral inline-flex min-h-11 items-center font-semibold">
            Back to sign in
          </Link>
        </p>
      </div>
    </FullScreenSignup>
  );
}
