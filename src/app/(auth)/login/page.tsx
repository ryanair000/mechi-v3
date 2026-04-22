'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { isPrimaryAdminHost } from '@/lib/admin-access';
import { getRegisterPath, getSafeNextPath, withQuery } from '@/lib/navigation';

type LoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type IdentifierKind = 'phone' | 'username' | 'email';

const DEFAULT_IDENTIFIER_META = {
  badge: 'Auto-detect on',
  placeholder: '0712 345 678, GameKing254, or you@example.com',
  helper:
    'Type whichever sign-in detail you remember best. Mechi will work out the right match.',
  inputMode: undefined,
  autoComplete: 'username',
  type: 'text' as const,
};

const IDENTIFIER_META: Record<
  IdentifierKind,
  {
    badge: string;
    placeholder: string;
    helper: string;
    inputMode?: 'tel' | 'email';
    autoComplete: string;
    type: 'text' | 'email';
  }
> = {
  phone: {
    badge: 'Phone number',
    placeholder: '0712 345 678',
    helper: 'We will use the phone number already saved on your Mechi profile.',
    inputMode: 'tel',
    autoComplete: 'username',
    type: 'text',
  },
  username: {
    badge: 'Username',
    placeholder: 'GameKing254',
    helper: 'Use the username other players see on your profile and match history.',
    autoComplete: 'username',
    type: 'text',
  },
  email: {
    badge: 'Email',
    placeholder: 'you@example.com',
    helper: 'Email works with your password, and it also unlocks magic link sign-in.',
    inputMode: 'email',
    autoComplete: 'email',
    type: 'email',
  },
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function detectIdentifierKind(value: string): IdentifierKind | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.includes('@')) {
    return 'email';
  }

  if (/^[+\d][\d\s\-()]{7,}$/.test(trimmedValue)) {
    return 'phone';
  }

  return 'username';
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const identifierKind = detectIdentifierKind(identifier);
  const identifierMeta = identifierKind ? IDENTIFIER_META[identifierKind] : DEFAULT_IDENTIFIER_META;
  const canUseMagicLink = identifierKind === 'email' && isValidEmail(identifier.trim());

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [authLoading, nextPath, router, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Enter your sign-in detail and password');
      setFeedback({
        tone: 'error',
        title: 'Your sign-in details are incomplete.',
        detail:
          'Add the phone number, username, or email you remember best, then enter your password.',
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
          login_method: 'auto',
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
        detail: 'Use your email, then request the link again.',
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
      subtitle="Use the detail you remember best. Mechi will detect whether it is your phone number, username, or email."
      sideTitle="Fast route back in."
      sideDescription="Password sign-in works across every account, and email can also unlock a magic link when you need it."
      sidePoints={[
        'One sign-in field for phone, username, or email',
        'Password sign-in plus optional email magic links',
        'Reset your password from your inbox in one step',
      ]}
    >
      <div className="space-y-5">
        <div className="subtle-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-title !mb-0">One sign-in field</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Start with the one detail you remember most. You do not need to choose a sign-in
                method first.
              </p>
            </div>
            <span className="rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
              {identifierKind
                ? `Using ${IDENTIFIER_META[identifierKind].badge}`
                : DEFAULT_IDENTIFIER_META.badge}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="redirect_to" value={nextPath} />
          <input type="hidden" name="login_method" value="auto" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="login-identifier" className="label mb-0">
                Phone number, username, or email
              </label>
              {identifierKind ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {IDENTIFIER_META[identifierKind].badge}
                </span>
              ) : null}
            </div>
            <input
              id="login-identifier"
              name="identifier"
              type={identifierMeta.type}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={identifierMeta.placeholder}
              className="input mt-2"
              autoComplete={identifierMeta.autoComplete}
              autoCapitalize="none"
              spellCheck={false}
              inputMode={identifierMeta.inputMode}
              aria-describedby="login-identifier-help"
              autoFocus
            />
            <p id="login-identifier-help" className="mt-2 text-xs text-[var(--text-soft)]">
              {identifierMeta.helper}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="label mb-0">
                Password
              </label>
              <Link href={forgotPasswordHref} className="brand-link-coral text-xs font-semibold uppercase tracking-[0.12em]">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                id="login-password"
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

          {canUseMagicLink ? (
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
