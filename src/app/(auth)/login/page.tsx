'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { isPrimaryAdminHost } from '@/lib/admin-access';
import { getRegisterPath, getSafeNextPath, withQuery } from '@/lib/navigation';

type LoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type LoginMethod = 'phone' | 'username' | 'email';

const LOGIN_METHODS: Array<{
  key: LoginMethod;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  {
    key: 'phone',
    label: 'Phone number',
    placeholder: '0712 345 678',
    helper: 'Use the phone number on your Mechi profile.',
  },
  {
    key: 'username',
    label: 'Username',
    placeholder: 'GameKing254',
    helper: 'Use the username you registered with.',
  },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'you@mail.com',
    helper: 'Use your email with a password or request a magic link.',
  },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const hostFallbackPath =
    typeof window !== 'undefined' && isPrimaryAdminHost(window.location.host)
      ? '/admin'
      : '/dashboard';
  const nextPath = getSafeNextPath(rawNext, hostFallbackPath);
  const registerHref = getRegisterPath({ next: rawNext ? nextPath : null });
  const forgotPasswordHref = withQuery('/forgot-password', {
    next: rawNext ? nextPath : null,
  });
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const methodMeta = useMemo(
    () => LOGIN_METHODS.find((item) => item.key === loginMethod) ?? LOGIN_METHODS[0],
    [loginMethod]
  );
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claimingPassword, setClaimingPassword] = useState(false);
  const [claimUsername, setClaimUsername] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [showClaimPassword, setShowClaimPassword] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [authLoading, nextPath, router, user]);

  useEffect(() => {
    setFeedback(null);
  }, [loginMethod]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Enter your sign-in details and password');
      setFeedback({
        tone: 'error',
        title: 'Your sign-in details are incomplete.',
        detail: 'Pick a method, enter the matching detail, then add your password.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Signing you in...',
      detail: 'Checking your Mechi account now.',
    });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          login_method: loginMethod,
          redirect_to: nextPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const failureDetail = data.error
          ? `${data.error} If this is an older Mechi profile, use the button below to set a new password.`
          : 'Please double-check your details and try again. If this is an older Mechi profile, use the button below to set a new password.';

        setFeedback({
          tone: 'error',
          title: 'Sign-in failed.',
          detail: failureDetail,
        });
        toast.error(data.error ?? 'Login failed');
        return;
      }

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: `Welcome back, ${data.user.username}.`,
        detail: 'Taking you back into Mechi now.',
      });
      toast.success(`Welcome back, ${data.user.username}!`);
      window.location.assign(nextPath);
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not reach the server.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    const email = identifier.trim();
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email address first');
      setFeedback({
        tone: 'error',
        title: 'A valid email is required for magic link sign-in.',
        detail: 'Switch to Email, enter your address, then request the link again.',
      });
      return;
    }

    setSendingMagicLink(true);
    setFeedback({
      tone: 'loading',
      title: 'Sending your sign-in link...',
      detail: 'If the account exists, the link will land in your inbox shortly.',
    });

    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect_to: nextPath }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'Could not send the sign-in link.',
          detail: data.error ?? 'Please try again in a moment.',
        });
        toast.error(data.error ?? 'Could not send sign-in link');
        return;
      }

      setFeedback({
        tone: 'success',
        title: 'Check your email.',
        detail: data.message ?? 'If the account exists, the sign-in link is on the way.',
      });
      toast.success(data.message ?? 'If that email exists, a sign-in link is on the way.');
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not send the sign-in link.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handlePasswordClaimRequest = async () => {
    if (!claimUsername.trim() || !claimEmail.trim() || !claimPassword) {
      toast.error('Enter username, email, and the new password');
      setFeedback({
        tone: 'error',
        title: 'Your existing-player details are incomplete.',
        detail: 'Add the username, the email on that profile, and the password you want to start using.',
      });
      return;
    }

    if (!isValidEmail(claimEmail.trim())) {
      toast.error('Enter a valid email address first');
      setFeedback({
        tone: 'error',
        title: 'A valid email is required for this overwrite flow.',
        detail: 'Use the email stored on the player profile you want to recover.',
      });
      return;
    }

    if (claimPassword.length < 9) {
      toast.error('Password must be more than 8 characters.');
      setFeedback({
        tone: 'error',
        title: 'Choose a stronger password.',
        detail: 'Your new Mechi password must be more than 8 characters.',
      });
      return;
    }

    setClaimingPassword(true);
    setFeedback({
      tone: 'loading',
      title: 'Updating your password...',
      detail: 'Matching the player profile and saving the password you entered now.',
    });

    try {
      const res = await fetch('/api/auth/password/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: claimUsername.trim(),
          email: claimEmail.trim(),
          password: claimPassword,
          redirect_to: nextPath,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          tone: 'error',
          title: 'Could not update the password.',
          detail: data.error ?? 'Please try again in a moment.',
        });
        toast.error(data.error ?? 'Could not update the password');
        return;
      }

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: 'Password updated.',
        detail: data.message ?? 'You are signed in now with the new password.',
      });
      toast.success(data.message ?? 'Password updated. You are signed in now.');
      window.location.assign(
        typeof data.redirect_to === 'string' ? data.redirect_to : nextPath
      );
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not update the password.',
        detail: 'Please check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setClaimingPassword(false);
    }
  };

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideEyebrow="mechi.club"
      sideTitle="Sign back in."
      sideDescription="Your profile, match history, and active setup are still waiting for you."
      hideMainHeader
      variant="marketing"
    >
      <div className="card p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2">
          {LOGIN_METHODS.map((method) => {
            const active = method.key === loginMethod;
            return (
              <button
                key={method.key}
                type="button"
                onClick={() => setLoginMethod(method.key)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                {method.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} action="/api/auth/login" method="post" className="mt-4 space-y-4">
          <input type="hidden" name="redirect_to" value={nextPath} />
          <input type="hidden" name="login_method" value={loginMethod} />

          <div>
            <label className="label">{methodMeta.label}</label>
            <input
              name="identifier"
              type={loginMethod === 'email' ? 'email' : loginMethod === 'phone' ? 'tel' : 'text'}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={methodMeta.placeholder}
              className="input"
              autoComplete={loginMethod === 'email' ? 'email' : 'username'}
              autoCapitalize="none"
              spellCheck={false}
              inputMode={loginMethod === 'phone' ? 'tel' : undefined}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="label mb-0">Password</label>
              <Link href={forgotPasswordHref} className="brand-link-coral text-xs font-semibold uppercase tracking-[0.12em]">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="input pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {feedback ? <ActionFeedback {...feedback} /> : null}

          <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

          {loginMethod === 'email' ? (
            <button
              type="button"
              onClick={() => void handleMagicLinkRequest()}
              disabled={sendingMagicLink}
              className="btn-ghost w-full"
            >
              {sendingMagicLink ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <Mail size={14} />
                  Email me a magic link
                </>
              )}
            </button>
          ) : null}
        </form>

        <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Existing player
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Match your username and email, then the password you enter here becomes your new Mechi password immediately.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                value={claimUsername}
                onChange={(event) => setClaimUsername(event.target.value)}
                placeholder="GameKing254"
                className="input"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={claimEmail}
                onChange={(event) => setClaimEmail(event.target.value)}
                placeholder="you@mail.com"
                className="input"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="label">New password</label>
              <div className="relative mt-2">
                <input
                  type={showClaimPassword ? 'text' : 'password'}
                  value={claimPassword}
                  onChange={(event) => setClaimPassword(event.target.value)}
                  placeholder="Enter the password you want to use"
                  className="input pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowClaimPassword((current) => !current)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                  aria-label={showClaimPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showClaimPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-soft)]">
                More than 8 characters.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handlePasswordClaimRequest()}
              disabled={claimingPassword || submitting || sendingMagicLink}
              className="btn-ghost w-full"
            >
              {claimingPassword ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  Set this as my password
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          New to Mechi?{' '}
          <Link href={registerHref} className="brand-link-coral inline-flex min-h-11 items-center font-semibold">
            Create your account
          </Link>
        </p>
      </div>
    </FullScreenSignup>
  );
}
