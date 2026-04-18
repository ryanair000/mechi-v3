'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
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
        setFeedback({
          tone: 'error',
          title: 'Sign-in failed.',
          detail: data.error ?? 'Please double-check your details and try again.',
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

  return (
    <FullScreenSignup
      title="Sign back in."
      subtitle="Choose phone number, username, or email, then get back to your queues, matches, and progress."
      sideTitle="Back to the climb."
      sideDescription="Your profile, match history, and active setup are still waiting for you."
      sidePoints={[
        'Phone, username, or email sign-in',
        'Password sign-in plus email magic links',
        'Reset your password from your inbox',
      ]}
    >
      <div className="card p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          Choose sign-in method
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          You can log in with your phone number, username, or email. Pick one option first.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
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

        <form onSubmit={handleSubmit} action="/api/auth/login" method="post" className="mt-5 space-y-4">
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
            <p className="mt-2 text-xs text-[var(--text-soft)]">{methodMeta.helper}</p>
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
