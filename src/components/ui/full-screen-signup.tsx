'use client';

import {
  ExternalLink,
  Loader2,
  LockKeyhole,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  SunIcon as Sunburst,
  User,
} from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { SignupPage } from '@/components/ui/sign-up-page';
import {
  COUNTRY_OPTIONS,
  getCountryLabel,
  getRegionsForCountry,
  normalizeCountryKey,
} from '@/lib/location';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  PLAYMECHI_WHATSAPP_GROUP_URL,
  getCustomerWhatsAppSupportUrl,
} from '@/lib/social-links';

type FullScreenSignupVariant = 'default' | 'marketing';
type FullScreenSignupFeedbackTone = 'error' | 'success' | 'loading';
type SideContentPlacement = 'default' | 'bottom';
const SIGNUP_SUPPORT_URL = getCustomerWhatsAppSupportUrl(
  'Hi PlayMechi, I need help creating my account.'
);

export interface FullScreenSignupValues {
  email: string;
  phone: string;
  username: string;
  password: string;
  country: string;
  region: string;
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
    <div className="relative">
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
    </div>
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
  const { country, locale, phonePlaceholder } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const [values, setValues] = useState<FullScreenSignupValues>({
    email: '',
    phone: '',
    username: '',
    password: '',
    country,
    region: '',
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
      nextErrors.email = isSwahili ? 'Weka barua pepe sahihi.' : 'Enter a valid email address.';
    }

    if (phoneDigits.length < 9) {
      nextErrors.phone = isSwahili ? 'Weka namba ya simu sahihi.' : 'Enter a valid phone number.';
    }

    if (username.length < 3) {
      nextErrors.username = isSwahili
        ? 'Username lazima iwe na angalau herufi 3.'
        : 'Username must be at least 3 characters.';
    }

    if (values.password.length < 9) {
      nextErrors.password = isSwahili
        ? 'Password lazima iwe na zaidi ya herufi 8.'
        : 'Password must be more than 8 characters.';
    }

    if (!normalizeCountryKey(values.country)) {
      nextErrors.country = isSwahili ? 'Chagua nchi.' : 'Choose your country.';
    }

    if (values.region.trim().length < 2) {
      nextErrors.region = isSwahili ? 'Weka region au mji.' : 'Enter your region or city.';
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
      country: normalizeCountryKey(values.country) ?? values.country,
      region: values.region.trim(),
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
      label: isSwahili ? 'Namba ya Simu' : 'Phone Number',
      type: 'tel',
      placeholder: phonePlaceholder,
      icon: <Phone className="h-4 w-4" />,
      autoComplete: 'tel',
    },
    {
      id: 'country',
      label: isSwahili ? 'Nchi' : 'Country',
      type: 'text',
      placeholder: getCountryLabel(country),
      icon: <MapPinned className="h-4 w-4" />,
      autoComplete: 'country-name',
    },
    {
      id: 'region',
      label: isSwahili ? 'Region / mji' : 'Region / city',
      type: 'text',
      placeholder: isSwahili ? 'Anza kuandika region' : 'Start typing your region',
      icon: <MapPinned className="h-4 w-4" />,
      autoComplete: 'address-level1',
    },
    {
      id: 'email',
      label: isSwahili ? 'Barua Pepe' : 'Mail Address',
      type: 'email',
      placeholder: 'you@mechi.club',
      icon: <Mail className="h-4 w-4" />,
      autoComplete: 'email',
    },
    {
      id: 'password',
      label: isSwahili ? 'Nenosiri' : 'Password',
      type: 'password',
      placeholder: isSwahili ? 'Zaidi ya herufi 8' : 'More than 8 characters',
      icon: <LockKeyhole className="h-4 w-4" />,
      autoComplete: 'new-password',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1121] px-4 py-6 text-slate-950">
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:min-h-[40rem] md:flex-row">
        <div className="relative min-h-[16rem] overflow-hidden bg-black text-white md:w-1/2">
          <div className="absolute inset-0 bg-[url('/playmechi-whatsapp-profile.jpg')] bg-cover bg-center opacity-70" />
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
                {isSwahili ? 'Tengeneza akaunti yako ya PlayMechi.' : 'Create your PlayMechi account.'}
              </h1>
            </div>
            <p className="mt-8 max-w-sm text-sm leading-6 text-white/78">
              {isSwahili
                ? 'Anza na taarifa za msingi. Michezo yako, ID zako, na mpangilio wa tournament utaongeza baada ya akaunti kuwashwa.'
                : 'Start with the essentials. Your games, IDs, and tournament setup can follow once the account is live.'}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center bg-secondary p-8 text-secondary-foreground md:p-12">
          <div className="mb-8">
            <div className="mb-4 text-orange-500">
              <Sunburst className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-medium tracking-normal">
              {isSwahili ? 'Anza Sasa' : 'Get Started'}
            </h2>
            <p className="mt-2 text-sm leading-6 opacity-80">
              {isSwahili
                ? 'Sajili akaunti mpya ya player wa PlayMechi.'
                : 'Register a new PlayMechi player account.'}
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <a
                href={PLAYMECHI_WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-500/15"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  {isSwahili
                    ? 'Jiunge na kundi la WhatsApp la PlayMechi'
                    : 'Join the PlayMechi WhatsApp group'}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-75" />
              </a>

              <a
                href={SIGNUP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-lg border border-cyan-600/20 bg-cyan-600/10 px-3 py-2 text-sm font-medium text-cyan-950 transition-colors hover:bg-cyan-600/15"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  {isSwahili ? 'Msaada wa WhatsApp:' : 'WhatsApp support:'}{' '}
                  {CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-75" />
              </a>
            </div>

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
                      list={
                        field.id === 'country'
                          ? 'standalone-country-options'
                          : field.id === 'region'
                            ? 'standalone-region-options'
                            : undefined
                      }
                      type={field.type}
                      placeholder={field.placeholder}
                      className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-black outline-none transition focus:ring-1 focus:ring-orange-500 ${
                        error ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={values[field.id]}
                      onChange={(event) => {
                        if (field.id === 'country') {
                          const nextCountry = normalizeCountryKey(event.target.value);
                          setField('country', nextCountry ?? event.target.value);
                          setField('region', '');
                          return;
                        }

                        setField(field.id, event.target.value);
                      }}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${field.id}-error` : undefined}
                      autoComplete={field.autoComplete}
                    />
                    {field.id === 'country' ? (
                      <datalist id="standalone-country-options">
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.key} value={option.label} />
                        ))}
                      </datalist>
                    ) : null}
                    {field.id === 'region' ? (
                      <datalist id="standalone-region-options">
                        {getRegionsForCountry(normalizeCountryKey(values.country)).map((region) => (
                          <option key={region} value={region} />
                        ))}
                      </datalist>
                    ) : null}
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
              {submitting
                ? isSwahili
                  ? 'Inatengeneza akaunti...'
                  : 'Creating account...'
                : submitLabel}
            </button>

            <div className="text-center text-sm text-gray-600">
              {isSwahili ? 'Tayari una akaunti?' : 'Already have account?'}{' '}
              <Link href={loginHref} className="font-medium text-secondary-foreground underline">
                {isSwahili ? 'Ingia' : 'Login'}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
