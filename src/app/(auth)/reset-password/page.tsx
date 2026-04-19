'use client';

import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath, withQuery } from '@/lib/navigation';

type ResetPasswordSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getFirstQueryValue(value: string | string[] | undefined) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: ResetPasswordSearchParams;
}) {
  const { login } = useAuth();
  const resolvedSearchParams = use(searchParams);
  const token = getFirstQueryValue(resolvedSearchParams.token)?.trim() ?? '';
  const rawNext = getFirstQueryValue(resolvedSearchParams.next);
  const nextPath = getSafeNextPath(rawNext);
  const loginHref = getLoginPath(rawNext ? nextPath : null);
  const forgotPasswordHref = withQuery('/forgot-password', {
    next: rawNext ? nextPath : null,
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const missingTokenToastShown = useRef(false);

  useEffect(() => {
    if (token || missingTokenToastShown.current) {
      return;
    }

    missingTokenToastShown.current = true;
    setFeedback({
      tone: 'error',
      title: 'This reset link is missing or incomplete.',
      detail: 'Request a fresh password reset email, then open the newest link.',
    });
    toast.error('This reset link is missing or incomplete.');
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setFeedback({
        tone: 'error',
        title: 'This reset link is not usable.',
        detail: 'Request a fresh email and try again with the newest link.',
      });
      toast.error('Request a new reset link.');
      return;
    }

    if (password.length < 9) {
      setFeedback({
        tone: 'error',
        title: 'Choose a stronger password.',
        detail: 'Your new password must be more than 8 characters.',
      });
      toast.error('Password must be more than 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        tone: 'error',
        title: 'Passwords do not match.',
        detail: 'Enter the same new password in both fields.',
      });
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Resetting your password...',
      detail: 'Securing your account and signing you in now.',
    });

    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const isExpired = data.code === 'password_reset_expired';
        const detail =
          data.error ??
          (isExpired
            ? 'That reset link expired. Request a fresh one.'
            : 'That reset link is invalid or already used.');

        setFeedback({
          tone: 'error',
          title: isExpired ? 'That reset link expired.' : 'That reset link is not valid anymore.',
          detail,
        });
        toast.error(detail);
        return;
      }

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: 'Password reset complete.',
        detail: 'You are signed in now. Opening Mechi for you.',
      });
      toast.success('Password reset complete. You are signed in now.');
      window.location.assign(
        typeof data.redirect_to === 'string' ? data.redirect_to : nextPath
      );
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not reset your password.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FullScreenSignup
      title="Choose a new password."
      subtitle="Set a fresh password, then jump straight back into Mechi."
      sideTitle="One quick step."
      sideDescription="Your reset link is single-use, secure, and made to get you moving again fast."
      sidePoints={[
        'Single-use reset links',
        'Immediate sign-in after reset',
        'Works with your email recovery flow',
      ]}
    >
      <div className="card p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                className="input pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-soft)]">
              Use more than 8 characters so your account stays protected.
            </p>
          </div>

          <div>
            <label className="label">Confirm password</label>
            <div className="relative mt-2">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter the same password again"
                className="input pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={submitting || !token} className="btn-primary w-full">
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Resetting password...
              </>
            ) : (
              <>
                <KeyRound size={14} />
                Reset password
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-[var(--text-secondary)]">
          <p>
            Need a new link?{' '}
            <Link
              href={forgotPasswordHref}
              className="brand-link-coral inline-flex min-h-11 items-center font-semibold"
            >
              Request another email
            </Link>
          </p>
          <p>
            Back to sign in:{' '}
            <Link
              href={loginHref}
              className="brand-link-coral inline-flex min-h-11 items-center font-semibold"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </FullScreenSignup>
  );
}
