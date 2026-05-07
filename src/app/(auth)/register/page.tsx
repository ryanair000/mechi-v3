'use client';

import Link from 'next/link';
import { use, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, Eye, EyeOff, Loader2, MessageCircle } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import { normalizeInviteCode } from '@/lib/invite';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  PLAYMECHI_WHATSAPP_GROUP_URL,
  getCustomerWhatsAppSupportUrl,
} from '@/lib/social-links';
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from '@/lib/username';

const MIN_PASSWORD_LENGTH = 9;
const ACCOUNT_REGISTRATION_SUPPORT_URL = getCustomerWhatsAppSupportUrl(
  'Hi Mechi, I need help creating my account.'
);

type RegisterSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface RegisterFormData {
  username: string;
  phone: string;
  email: string;
  password: string;
}

export default function RegisterPage({ searchParams }: { searchParams: RegisterSearchParams }) {
  const { user, loading: authLoading, login } = useAuth();
  const resolvedSearchParams = use(searchParams);
  const rawInviteValue = resolvedSearchParams.invite;
  const rawInviteCode =
    typeof rawInviteValue === 'string'
      ? rawInviteValue
      : Array.isArray(rawInviteValue)
        ? rawInviteValue[0] ?? null
        : null;
  const normalizedInviteCode = normalizeInviteCode(rawInviteCode);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext, '/dashboard');
  const loginHref = getLoginPath(rawNext ? nextPath : null);
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign(nextPath);
    }
  }, [authLoading, nextPath, user]);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const normalizedUsername = normalizeUsername(formData.username);
  const usernameValidation = validateUsername(formData.username);
  const phoneIsValid = formData.phone.replace(/\D/g, '').length >= 9;
  const passwordIsValid = formData.password.length >= MIN_PASSWORD_LENGTH;
  const formIsValid = !usernameValidation.error && phoneIsValid && emailIsValid && passwordIsValid;

  const setField = (field: keyof RegisterFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setSubmitFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formIsValid) {
      setSubmitFeedback({
        tone: 'error',
        title: 'Check the four account fields.',
        detail: usernameValidation.error ?? 'Username, phone, mail address, and password are required.',
      });
      return;
    }

    setLoading(true);
    setSubmitFeedback({
      tone: 'loading',
      title: 'Creating your Mechi account...',
      detail: 'Saving the essentials and starting your Pro trial now.',
    });

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normalizedUsername,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          password: formData.password,
          invite_code: normalizedInviteCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitFeedback({
          tone: 'error',
          title: 'Registration did not go through.',
          detail: data.error ?? 'Please check your details and try again.',
        });
        toast.error(data.error ?? 'Registration failed');
        return;
      }

      login(data.token, data.user);
      setSubmitFeedback({
        tone: 'success',
        title: `Welcome to Mechi, ${data.user.username}.`,
        detail: 'Your account is live. Taking you into Mechi now.',
      });
      toast.success(`Welcome to Mechi, ${data.user.username}!`);
      window.location.assign(nextPath);
    } catch {
      setSubmitFeedback({
        tone: 'error',
        title: 'We could not reach the server.',
        detail: 'Your account was not created. Check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideTitle="Join Mechi Now"
      sideDescription="Pull up, lock in, compete with real players, and win prizes in Mechi tournaments."
      hideSideEyebrow
      sideContentPlacement="bottom"
      hideMainHeader
      variant="marketing"
    >
      <form className="card p-4 sm:p-6" onSubmit={handleSubmit} noValidate>
        <p className="mb-5 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link
            href={user ? nextPath : loginHref}
            className="brand-link-coral inline-flex min-h-11 items-center font-semibold"
          >
            Sign in
          </Link>
        </p>

        <div className="mb-5 grid gap-2">
          <a
            href={PLAYMECHI_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-3 rounded-lg border border-[#25d366]/25 bg-[#25d366]/10 px-3 py-2 text-sm font-semibold text-[#7cf0ad] transition-colors hover:bg-[#25d366]/15"
          >
            <MessageCircle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">Join the PlayMechi WhatsApp group</span>
            <ExternalLink size={14} className="shrink-0 opacity-80" />
          </a>

          <a
            href={ACCOUNT_REGISTRATION_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-3 rounded-lg border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)] px-3 py-2 text-sm font-semibold text-[var(--accent-secondary-text)] transition-colors hover:bg-[rgba(50,224,196,0.12)]"
          >
            <MessageCircle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              WhatsApp support: {CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}
            </span>
            <ExternalLink size={14} className="shrink-0 opacity-80" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(event) => setField('username', event.target.value)}
              onBlur={() =>
                setFormData((current) => ({
                  ...current,
                  username: normalizeUsername(current.username),
                }))
              }
              placeholder="GameKing254"
              className="input"
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
              autoComplete="username"
              aria-invalid={Boolean(usernameValidation.error)}
            />
            {usernameValidation.error ? (
              <p className="input-hint mt-2 text-[var(--brand-coral)]">
                {usernameValidation.error}
              </p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="0712 345 678"
              className="input"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Mail Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => setField('email', event.target.value)}
              placeholder="you@example.com"
              className="input"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(event) => setField('password', event.target.value)}
                placeholder="More than 8 characters"
                className="input pr-12"
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formData.password.length > 0 && !passwordIsValid ? (
              <p className="mt-2 text-xs text-[var(--brand-coral)]">
                Password must be more than 8 characters.
              </p>
            ) : null}
          </div>

          {submitFeedback ? (
            <ActionFeedback
              tone={submitFeedback.tone}
              title={submitFeedback.title}
              detail={submitFeedback.detail}
            />
          ) : null}

          <button
            type="submit"
            disabled={loading || !formIsValid}
            className="btn-primary mt-2 w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>
    </FullScreenSignup>
  );
}
