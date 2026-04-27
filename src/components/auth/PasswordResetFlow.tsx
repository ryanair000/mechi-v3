'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { normalizeUsername, validateUsername } from '@/lib/username';

const MIN_PASSWORD_LENGTH = 9;

interface PasswordResetFlowProps {
  loginHref: string;
  nextPath: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function PasswordResetFlow({ loginHref, nextPath }: PasswordResetFlowProps) {
  const { login } = useAuth();
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

  const handleVerifyIdentity = async (event: React.FormEvent) => {
    event.preventDefault();

    const { username: normalized, error: usernameError } = validateUsername(username);
    if (usernameError || !email.trim()) {
      setFeedback({
        tone: 'error',
        title: usernameError ?? 'Your account details are incomplete.',
        detail: 'Enter the username and email connected to your Mechi profile.',
      });
      toast.error('Enter your username and email.');
      return;
    }

    if (!isValidEmail(email.trim())) {
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
      title: 'Checking your account details...',
      detail: 'Matching the username and email on your Mechi profile now.',
    });

    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'verify',
          username: normalized,
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

      setUsername(normalized);
      setEmail(email.trim());
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

    if (password.length < MIN_PASSWORD_LENGTH) {
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
          username: normalizeUsername(username),
          email: email.trim(),
          password,
          redirect_to: nextPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'We could not reset your password.',
          detail: data.error ?? 'Please check your details and try again.',
        });
        toast.error(data.error ?? 'Could not reset your password.');
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
    <div className="card p-4 sm:p-6">
      <div className="mb-5 rounded-xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
          {identityVerified ? 'Step 2 of 2' : 'Step 1 of 2'}
        </p>
        <p className="mt-1 text-sm text-[var(--text-primary)]">
          {identityVerified
            ? 'Your account details match. Set the new password you want to use now.'
            : 'Enter the matching username and email first so we can unlock the password step.'}
        </p>
      </div>

      {!identityVerified ? (
        <form onSubmit={handleVerifyIdentity} className="space-y-4">
          <div>
            <label htmlFor="password-reset-username" className="label">
              Username
            </label>
            <input
              id="password-reset-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={() => setUsername((current) => normalizeUsername(current))}
              placeholder="GameKing254"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <div>
            <label htmlFor="password-reset-email" className="label">
              Email
            </label>
            <input
              id="password-reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmail((current) => current.trim())}
              placeholder="you@mail.com"
              className="input"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={verifyingIdentity} className="btn-primary mt-2 w-full">
            {verifyingIdentity ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Checking details...
              </>
            ) : (
              'Verify account'
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
              {normalizeUsername(username)} using {email.trim()}
            </p>
          </div>

          <div>
            <label htmlFor="password-reset-new-password" className="label">
              New password
            </label>
            <div className="relative mt-2">
              <input
                id="password-reset-new-password"
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
            <label htmlFor="password-reset-confirm-password" className="label">
              Confirm password
            </label>
            <div className="relative mt-2">
              <input
                id="password-reset-confirm-password"
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
                aria-label={
                  showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
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
  );
}
