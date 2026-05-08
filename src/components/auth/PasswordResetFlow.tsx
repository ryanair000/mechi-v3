'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Loader2, UserCheck } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { getPostLoginRedirectPath } from '@/lib/navigation';
import {
  normalizeRecoveryContactInput,
  parseRecoveryContact,
} from '@/lib/recovery-contact';

const MIN_PASSWORD_LENGTH = 9;

interface PasswordResetFlowProps {
  loginHref: string;
  nextPath: string;
  token?: string | null;
}

interface VerifiedIdentity {
  username: string;
  contact: string;
}

export function PasswordResetFlow({ loginHref, nextPath, token }: PasswordResetFlowProps) {
  const { login } = useAuth();
  const [resetToken] = useState(token ?? '');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedIdentity | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const hasToken = Boolean(resetToken);
  const canSetPassword = hasToken || Boolean(verifiedIdentity);

  const handleVerifyIdentity = async (event: React.FormEvent) => {
    event.preventDefault();

    const submittedUsername = username.trim();
    const submittedContact = normalizeRecoveryContactInput(contact);
    const parsedContact = parseRecoveryContact(submittedContact);
    if (!submittedUsername) {
      setFeedback({
        tone: 'error',
        title: 'Your username is required.',
        detail: 'Enter the username on the Mechi account you want to recover.',
      });
      toast.error('Enter your username.');
      return;
    }

    if (!parsedContact) {
      setFeedback({
        tone: 'error',
        title: 'A valid email or phone number is required.',
        detail: 'Use the email address or phone number connected to the same Mechi profile.',
      });
      toast.error('Enter a valid email address or phone number.');
      return;
    }

    setVerifyingAccount(true);
    setFeedback({
      tone: 'loading',
      title: 'Checking your account...',
      detail: 'Matching the username and account contact on your Mechi profile.',
    });

    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: submittedUsername,
          contact: submittedContact,
          redirect_to: nextPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'Those details did not match.',
          detail: data.error ?? 'Check the username and email or phone, then try again.',
        });
        toast.error(data.error ?? 'Those account details did not match.');
        return;
      }

      setVerifiedIdentity({ username: submittedUsername, contact: submittedContact });
      setUsername(submittedUsername);
      setContact(submittedContact);
      setPassword('');
      setConfirmPassword('');
      setFeedback({
        tone: 'success',
        title: 'Account matched.',
        detail: data.message ?? 'Choose a new password to secure your Mechi account.',
      });
      toast.success('Account matched. Choose a new password.');
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not check those details.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSetPassword) {
      setFeedback({
        tone: 'error',
        title: 'Confirm your account first.',
        detail: 'Enter the username and email or phone on your Mechi profile before choosing a new password.',
      });
      toast.error('Confirm your username and email or phone first.');
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
      const payload: Record<string, string> = {
        password,
        redirect_to: nextPath,
      };

      if (hasToken) {
        payload.token = resetToken;
      } else if (verifiedIdentity) {
        payload.username = verifiedIdentity.username;
        payload.contact = verifiedIdentity.contact;
      }

      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'We could not reset your password.',
          detail: data.error ?? 'Check your account details and try again.',
        });
        toast.error(data.error ?? 'Could not reset your password.');
        return;
      }

      const redirectPath = getPostLoginRedirectPath(
        data.user,
        typeof data.redirect_to === 'string' ? data.redirect_to : nextPath
      );

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: 'Password reset complete.',
        detail: 'You are signed in now. Opening Mechi for you.',
      });
      toast.success('Password reset complete. You are signed in now.');
      window.location.assign(redirectPath);
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
          {canSetPassword ? 'New password' : 'Account check'}
        </p>
        <p className="mt-1 text-sm text-[var(--text-primary)]">
          {hasToken
            ? 'Set a new password and Mechi will sign you in right away.'
            : canSetPassword
              ? 'Account matched. Choose a new password and Mechi will sign you in right away.'
              : 'Enter your username and email or phone. If they match, you can set a new password.'}
        </p>
      </div>

      {!canSetPassword ? (
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
              onBlur={() => setUsername((current) => current.trim())}
              placeholder="Your Mechi username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <div>
            <label htmlFor="password-reset-contact" className="label">
              Email or phone
            </label>
            <input
              id="password-reset-contact"
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              onBlur={() => setContact((current) => normalizeRecoveryContactInput(current))}
              placeholder="you@mail.com or 0712 345 678"
              className="input"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={verifyingAccount} className="btn-primary mt-2 w-full">
            {verifyingAccount ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <UserCheck size={14} />
                Continue
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
