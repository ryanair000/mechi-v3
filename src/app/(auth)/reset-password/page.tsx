'use client';

import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);
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

  const handleVerifyIdentity = async (event: React.FormEvent) => {
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

    if (!username.trim() || !email.trim()) {
      setFeedback({
        tone: 'error',
        title: 'Your account details are incomplete.',
        detail: 'Enter the username and email connected to your Mechi profile.',
      });
      toast.error('Enter your username and email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFeedback({
        tone: 'error',
        title: 'A valid email is required.',
        detail: 'Use the email connected to the profile you want to recover.',
      });
      toast.error('Enter a valid email address.');
      return;
    }

    setVerifyingIdentity(true);
    setFeedback({
      tone: 'loading',
      title: 'Checking your reset details...',
      detail: 'Matching the username and email on this reset link now.',
    });

    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'verify',
          token,
          username: username.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'We could not confirm that account.',
          detail: data.error ?? 'Please double-check the username and email on this profile.',
        });
        toast.error(data.error ?? 'Could not confirm that account.');
        return;
      }

      setIdentityVerified(true);
      setFeedback({
        tone: 'success',
        title: 'Identity confirmed.',
        detail: data.message ?? 'You can set your new password now.',
      });
      toast.success(data.message ?? 'Identity confirmed. Set your new password.');
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not confirm your details.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setVerifyingIdentity(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!identityVerified) {
      setFeedback({
        tone: 'error',
        title: 'Confirm the account first.',
        detail: 'Enter the matching username and email before you set a new password.',
      });
      toast.error('Confirm the username and email first.');
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
        body: JSON.stringify({
          intent: 'reset',
          token,
          username: username.trim(),
          email: email.trim(),
          password,
        }),
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
      title=""
      subtitle=""
      sideEyebrow="mechi.club"
      sideTitle="Reset your password."
      sideDescription="Confirm the username and email on your Mechi profile, then set a fresh password and jump back in."
      sidePoints={[
        'Confirm username + email first',
        'Set your new password on the next step',
        'Immediate sign-in after reset',
      ]}
      hideMainHeader
      variant="marketing"
    >
      <div className="card p-4 sm:p-6">
        <div className="mb-5 rounded-xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
            {!token ? 'Reset link issue' : identityVerified ? 'Step 2 of 2' : 'Step 1 of 2'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-primary)]">
            {!token
              ? 'This link is missing or expired. Request a fresh reset email to continue.'
              : identityVerified
                ? 'Your account details match. Set the new password you want to use now.'
                : 'Enter the matching username and email first so we can unlock the password step.'}
          </p>
        </div>

        {!identityVerified ? (
          <form onSubmit={handleVerifyIdentity} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="GameKing254"
                className="input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

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

            <button
              type="submit"
              disabled={verifyingIdentity || !token}
              className="btn-primary mt-2 w-full"
            >
              {verifyingIdentity ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Checking details...
                </>
              ) : (
                'Next'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Account confirmed
              </p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {username.trim()} using {email.trim()}
              </p>
            </div>

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

            <button type="submit" disabled={submitting || !token} className="btn-primary mt-2 w-full">
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

            <button
              type="button"
              onClick={() => {
                setIdentityVerified(false);
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
                setFeedback(null);
              }}
              className="btn-ghost w-full justify-center"
            >
              <ArrowLeft size={14} />
              Edit username and email
            </button>
          </form>
        )}

        <Link href={forgotPasswordHref} className="btn-ghost mt-4 w-full justify-center">
          <Mail size={14} />
          Request another email
        </Link>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Remembered it?{' '}
          <Link
            href={loginHref}
            className="brand-link-coral inline-flex min-h-11 items-center font-semibold"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </FullScreenSignup>
  );
}
