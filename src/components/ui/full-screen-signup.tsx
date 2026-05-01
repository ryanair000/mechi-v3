'use client';

import { Loader2, LockKeyhole, Mail, Phone, SunIcon as Sunburst, User } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { SignupPage } from '@/components/ui/sign-up-page';

type FullScreenSignupVariant = 'default' | 'marketing';
type FullScreenSignupFeedbackTone = 'error' | 'success' | 'loading';
type SideContentPlacement = 'default' | 'bottom';

export interface FullScreenSignupValues {
  email: string;
  phone: string;
  username: string;
  password: string;
}

export interface FullScreenSignupFeedback {
  tone: FullScreenSignupFeedbackTone;
  title: string;
  detail?: string;
}

interface FullScreenSignupProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  sideEyebrow?: string;
  sideTitle?: string;
  sideDescription?: string;
  sidePoints?: string[];
  variant?: FullScreenSignupVariant;
  hideMainHeader?: boolean;
  hideSideEyebrow?: boolean;
  sideContentPlacement?: SideContentPlacement;
  onSubmit?: (values: FullScreenSignupValues) => void | Promise<void>;
  submitting?: boolean;
  feedback?: FullScreenSignupFeedback | null;
  submitLabel?: string;
  loginHref?: string;
}

export function FullScreenSignup({
  children,
  title = '',
  subtitle = '',
  sideEyebrow,
  sideTitle,
  sideDescription,
  sidePoints = [],
  variant = 'default',
  hideMainHeader = false,
  hideSideEyebrow = false,
  sideContentPlacement = 'default',
  onSubmit,
  submitting = false,
  feedback = null,
  submitLabel = 'Create account',
  loginHref = '/login',
}: FullScreenSignupProps) {
  if (!children) {
    return (
      <StandaloneFullScreenSignup
        feedback={feedback}
        loginHref={loginHref}
        onSubmit={onSubmit}
        submitLabel={submitLabel}
        submitting={submitting}
      />
    );
  }

  return (
    <SignupPage
      title={title}
      subtitle={subtitle}
      sideEyebrow={sideEyebrow}
      sideTitle={sideTitle}
      sideDescription={sideDescription}
      sidePoints={sidePoints}
      variant={variant}
      hideMainHeader={hideMainHeader}
      hideSideEyebrow={hideSideEyebrow}
      sideContentPlacement={sideContentPlacement}
    >
      {children}
    </SignupPage>
  );
}

function StandaloneFullScreenSignup({
  feedback,
  loginHref,
  onSubmit,
  submitting,
  submitLabel,
}: Required<Pick<FullScreenSignupProps, 'loginHref' | 'submitting' | 'submitLabel'>> &
  Pick<FullScreenSignupProps, 'feedback' | 'onSubmit'>) {
  const [values, setValues] = useState<FullScreenSignupValues>({
    email: '',
    phone: '',
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FullScreenSignupValues, string>>>({});

  const setField = (field: keyof FullScreenSignupValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FullScreenSignupValues, string>> = {};
    const email = values.email.trim();
    const phoneDigits = values.phone.replace(/\D/g, '');
    const username = values.username.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (phoneDigits.length < 9) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    if (username.length < 3) {
      nextErrors.username = 'Username must be at least 3 characters.';
    }

    if (values.password.length < 9) {
      nextErrors.password = 'Password must be more than 8 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    await onSubmit?.({
      email: values.email.trim(),
      phone: values.phone.trim(),
      username: values.username.trim(),
      password: values.password,
    });
  };

  const feedbackToneClass =
    feedback?.tone === 'success'
      ? 'border-emerald-300/40 bg-emerald-50 text-emerald-900'
      : feedback?.tone === 'loading'
        ? 'border-orange-300/40 bg-orange-50 text-orange-950'
        : 'border-red-300/50 bg-red-50 text-red-950';

  const fields: Array<{
    id: keyof FullScreenSignupValues;
    label: string;
    type: string;
    placeholder: string;
    icon: ReactNode;
    autoComplete: string;
  }> = [
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'GameKing254',
      icon: <User className="h-4 w-4" />,
      autoComplete: 'username',
    },
    {
      id: 'phone',
      label: 'Phone Number',
      type: 'tel',
      placeholder: '0712 345 678',
      icon: <Phone className="h-4 w-4" />,
      autoComplete: 'tel',
    },
    {
      id: 'email',
      label: 'Mail Address',
      type: 'email',
      placeholder: 'you@mechi.club',
      icon: <Mail className="h-4 w-4" />,
      autoComplete: 'email',
    },
    {
      id: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'More than 8 characters',
      icon: <LockKeyhole className="h-4 w-4" />,
      autoComplete: 'new-password',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1121] px-4 py-6 text-slate-950">
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:min-h-[40rem] md:flex-row">
        <div className="relative min-h-[16rem] overflow-hidden bg-black text-white md:w-1/2">
          <div className="absolute inset-0 bg-[url('/mechi-whatsapp-profile.jpg')] bg-cover bg-center opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/68 to-orange-950/60" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
          <div className="relative z-10 flex h-full min-h-[16rem] flex-col justify-between p-8 md:p-12">
            <div>
              <div className="mb-7 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-950/30">
                <Sunburst className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-200">
                mechi.club
              </p>
              <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Create your Mechi account.
              </h1>
            </div>
            <p className="mt-8 max-w-sm text-sm leading-6 text-white/78">
              Start with the essentials. Your games, IDs, and tournament setup can follow once the
              account is live.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center bg-secondary p-8 text-secondary-foreground md:p-12">
          <div className="mb-8">
            <div className="mb-4 text-orange-500">
              <Sunburst className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-medium tracking-normal">Get Started</h2>
            <p className="mt-2 text-sm leading-6 opacity-80">
              Register a new Mechi player account.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {fields.map((field) => {
              const error = errors[field.id];

              return (
                <div key={field.id}>
                  <label htmlFor={field.id} className="mb-2 block text-sm font-medium">
                    {field.label}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400">
                      {field.icon}
                    </span>
                    <input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-black outline-none transition focus:ring-1 focus:ring-orange-500 ${
                        error ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={values[field.id]}
                      onChange={(event) => setField(field.id, event.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${field.id}-error` : undefined}
                      autoComplete={field.autoComplete}
                    />
                  </div>
                  {error ? (
                    <p id={`${field.id}-error`} className="mt-1 text-xs text-red-600">
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {feedback ? (
              <div className={`rounded-lg border px-3 py-2.5 text-sm ${feedbackToneClass}`}>
                <p className="font-medium">{feedback.title}</p>
                {feedback.detail ? <p className="mt-1 text-xs opacity-80">{feedback.detail}</p> : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Creating account...' : submitLabel}
            </button>

            <div className="text-center text-sm text-gray-600">
              Already have account?{' '}
              <Link href={loginHref} className="font-medium text-secondary-foreground underline">
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
