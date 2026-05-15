'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { getPostLoginRedirectPath } from '@/lib/navigation';

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
    helper: 'Use your email with a password, or get a secure sign-in link.',
  },
];

const SW_LOGIN_METHODS: Array<{
  key: LoginMethod;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  {
    key: 'phone',
    label: 'Namba ya simu',
    placeholder: '0755 123 456',
    helper: 'Tumia namba ya simu iliyo kwenye profile yako ya Mechi.',
  },
  {
    key: 'username',
    label: 'Username',
    placeholder: 'GameKingTZ',
    helper: 'Tumia username uliyosajili nayo.',
  },
  {
    key: 'email',
    label: 'Barua pepe',
    placeholder: 'wewe@mail.com',
    helper: 'Tumia email yako na password, au omba link salama ya kuingia.',
  },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AuthLoginScreen({
  nextPath,
  footerHref,
  footerLinkLabel,
  footerPrompt,
  sideDescription,
  sideTitle,
}: {
  nextPath: string;
  footerHref: string;
  footerLinkLabel: string;
  footerPrompt: string;
  sideDescription: string;
  sideTitle: string;
}) {
  const { user, loading: authLoading, login } = useAuth();
  const { locale, phonePlaceholder } = useRegionalSettings();
  const router = useRouter();
  const isSwahili = locale === 'sw-TZ';
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const loginMethods = useMemo(
    () =>
      (isSwahili ? SW_LOGIN_METHODS : LOGIN_METHODS).map((method) =>
        method.key === 'phone' ? { ...method, placeholder: phonePlaceholder } : method
      ),
    [isSwahili, phonePlaceholder]
  );
  const methodMeta = useMemo(
    () => loginMethods.find((item) => item.key === loginMethod) ?? loginMethods[0],
    [loginMethod, loginMethods]
  );
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const identifierInputId = `login-${loginMethod}-identifier`;

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(getPostLoginRedirectPath(user, nextPath));
    }
  }, [authLoading, nextPath, router, user]);

  useEffect(() => {
    setFeedback(null);
  }, [loginMethod]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(
        isSwahili
          ? 'Weka taarifa zako za kuingia pamoja na password'
          : 'Enter your sign-in details and password'
      );
      setFeedback({
        tone: 'error',
        title: isSwahili ? 'Taarifa zako za kuingia hazijakamilika.' : 'Your sign-in details are incomplete.',
        detail: isSwahili
          ? 'Chagua njia, weka taarifa sahihi, halafu ongeza password.'
          : 'Pick a method, enter the matching detail, then add your password.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: isSwahili ? 'Inaingiza akaunti yako...' : 'Signing you in...',
      detail: isSwahili ? 'Tunaikagua akaunti yako ya Mechi sasa.' : 'Checking your Mechi account now.',
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
          title: isSwahili ? 'Kuingia kumeshindikana.' : 'Sign-in failed.',
          detail:
            data.error ??
            (isSwahili
              ? 'Tafadhali hakiki taarifa zako halafu ujaribu tena.'
              : 'Please double-check your details and try again.'),
        });
        toast.error(data.error ?? (isSwahili ? 'Kuingia kumeshindikana' : 'Login failed'));
        return;
      }

      const redirectPath = getPostLoginRedirectPath(
        data.user,
        typeof data.redirect_to === 'string' ? data.redirect_to : nextPath
      );

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: isSwahili
          ? `Karibu tena, ${data.user.username}.`
          : `Welcome back, ${data.user.username}.`,
        detail: isSwahili ? 'Tunakukalisha ndani ya Mechi sasa.' : 'Taking you into Mechi now.',
      });
      toast.success(
        isSwahili ? `Karibu tena, ${data.user.username}!` : `Welcome back, ${data.user.username}!`
      );
      window.location.assign(redirectPath);
    } catch {
      setFeedback({
        tone: 'error',
        title: isSwahili ? 'Tumeshindwa kufikia server.' : 'We could not reach the server.',
        detail: isSwahili
          ? 'Tafadhali angalia intaneti yako halafu ujaribu tena.'
          : 'Please check your connection and try again.',
      });
      toast.error(isSwahili ? 'Hitilafu ya mtandao.' : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    const email = identifier.trim();
    if (!isValidEmail(email)) {
      toast.error(
        isSwahili ? 'Weka kwanza barua pepe sahihi' : 'Enter a valid email address first'
      );
      setFeedback({
        tone: 'error',
        title: isSwahili ? 'Barua pepe sahihi inahitajika.' : 'A valid email is required.',
        detail: isSwahili
          ? 'Badili kwenda Email kisha weka anuani iliyo kwenye profile yako ya Mechi.'
          : 'Switch to Email and enter the address on your Mechi profile.',
      });
      return;
    }

    setSendingMagicLink(true);
    setFeedback({
      tone: 'loading',
      title: isSwahili
        ? 'Tunatuma link salama ya kuingia...'
        : 'Sending a secure sign-in link...',
      detail: isSwahili
        ? 'Ikiwa email hiyo inalingana na akaunti ya Mechi, link iko njiani.'
        : 'If that email matches a Mechi account, the link is on the way.',
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
          title: isSwahili
            ? 'Tumeshindwa kutuma link ya kuingia.'
            : 'We could not send that sign-in link.',
          detail:
            data.error ??
            (isSwahili
              ? 'Angalia barua pepe hiyo halafu ujaribu tena.'
              : 'Check the email address and try again.'),
        });
        toast.error(
          data.error ??
            (isSwahili
              ? 'Tumeshindwa kutuma link ya kuingia.'
              : 'We could not send that sign-in link.')
        );
        return;
      }

      setFeedback({
        tone: 'success',
        title: isSwahili ? 'Angalia email yako.' : 'Check your email.',
        detail:
          data.message ??
          (isSwahili
            ? 'Ikiwa taarifa hizo zinafanana, link yako ya kuingia iko njiani.'
            : 'If those details match, your sign-in link is on the way.'),
      });
      toast.success(
        isSwahili
          ? 'Angalia email yako kwa link ya kuingia.'
          : 'Check your email for the sign-in link.'
      );
    } catch {
      setFeedback({
        tone: 'error',
        title: isSwahili ? 'Tumeshindwa kukagua taarifa hizo.' : 'We could not check those details.',
        detail: isSwahili
          ? 'Tafadhali angalia intaneti yako halafu ujaribu tena.'
          : 'Please check your connection and try again.',
      });
      toast.error(isSwahili ? 'Hitilafu ya mtandao.' : 'Network error.');
    } finally {
      setSendingMagicLink(false);
    }
  };

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      hideSideEyebrow
      sideContentPlacement="bottom"
      hideMainHeader
      variant="marketing"
    >
      <div className="card p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2">
          {loginMethods.map((method) => {
            const active = method.key === loginMethod;
            return (
              <button
                key={method.key}
                type="button"
                onClick={() => setLoginMethod(method.key)}
                className={`min-h-11 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-none ${
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
            <label className="label" htmlFor={identifierInputId}>
              {methodMeta.label}
            </label>
            <input
              id={identifierInputId}
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
            <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{methodMeta.helper}</p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="label mb-0" htmlFor="login-password">
                {isSwahili ? 'Nenosiri' : 'Password'}
              </label>
              <Link
                href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
                className="brand-link-coral text-xs font-semibold uppercase tracking-[0.12em]"
              >
                {isSwahili ? 'Umesahau nenosiri?' : 'Forgot password?'}
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSwahili ? 'Weka nenosiri lako' : 'Enter your password'}
                className="input pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                aria-label={
                  showPassword
                    ? isSwahili
                      ? 'Ficha nenosiri'
                      : 'Hide password'
                    : isSwahili
                      ? 'Onyesha nenosiri'
                      : 'Show password'
                }
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
                {isSwahili ? 'Inaingia...' : 'Signing in...'}
              </>
            ) : (
              isSwahili ? 'Ingia' : 'Sign in'
            )}
          </button>

          {loginMethod === 'email' ? (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {isSwahili ? 'Huna password sasa?' : 'No password right now?'}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                {isSwahili
                  ? 'Weka email yako hapo juu na Mechi itakutumia link ya kuingia mara moja.'
                  : 'Enter your email above and Mechi will send a one-time sign-in link.'}
              </p>
              <button
                type="button"
                onClick={() => void handleMagicLinkRequest()}
                disabled={sendingMagicLink}
                className="btn-ghost mt-3 w-full"
              >
                {sendingMagicLink ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {isSwahili ? 'Inatuma link...' : 'Sending link...'}
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    {isSwahili ? 'Nitumie link ya kuingia' : 'Email me a sign-in link'}
                  </>
                )}
              </button>
            </div>
          ) : null}
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {footerPrompt}{' '}
          <Link href={footerHref} className="brand-link-coral inline-flex min-h-11 items-center font-semibold">
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </FullScreenSignup>
  );
}
