'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';

type TesterForm = {
  fullName: string;
  playEmail: string;
  whatsappNumber: string;
  deviceModel: string;
  androidVersion: string;
  notes: string;
  canStayOptedIn: boolean;
};

const initialForm: TesterForm = {
  fullName: '',
  playEmail: '',
  whatsappNumber: '',
  deviceModel: '',
  androidVersion: '',
  notes: '',
  canStayOptedIn: false,
};

const ANDROID_VERSIONS = [
  'Android 15',
  'Android 14',
  'Android 13',
  'Android 12',
  'Android 11',
  'Android 10',
  'Android 9 or older',
  'Not sure',
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function hasEnoughPhoneDigits(value: string) {
  return value.replace(/\D/g, '').length >= 9;
}

export function AndroidTestersClient() {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [form, setForm] = useState<TesterForm>(initialForm);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const [loading, setLoading] = useState(false);

  const formIsValid =
    Boolean(user) &&
    form.fullName.trim().length >= 2 &&
    isValidEmail(form.playEmail) &&
    hasEnoughPhoneDigits(form.whatsappNumber) &&
    form.deviceModel.trim().length >= 2 &&
    form.canStayOptedIn;

  const setField = <Key extends keyof TesterForm>(field: Key, value: TesterForm[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setFeedback({
        tone: 'error',
        title: 'Sign in first.',
        detail: 'Only logged-in Mechi players can join the v4.0.1 Android early access list.',
      });
      return;
    }

    if (!formIsValid) {
      setFeedback({
        tone: 'error',
        title: 'Almost there.',
        detail:
          'Add your name, Play Store email, WhatsApp number, Android phone model, and early access confirmation.',
      });
      return;
    }

    setLoading(true);
    setFeedback({
      tone: 'loading',
      title: 'Locking in your spot...',
      detail: 'Adding your Play Store account to the Mechi v4.0.1 early access list.',
    });

    try {
      const response = await authFetch('/api/android-testers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          title: 'Could not save early access details.',
          detail: data.error ?? 'Try again in a moment.',
        });
        return;
      }

      setForm(initialForm);
      setFeedback({
        tone: 'success',
        title: 'You are on the early list.',
        detail:
          data.message ??
          'We will send the Mechi v4.0.1 Android early access link on WhatsApp when your invite is ready.',
      });
    } catch {
      setFeedback({
        tone: 'error',
        title: 'Network problem.',
        detail: 'Your early access request was not saved. Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="card p-4 sm:p-5" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
          <div>
            <p className="section-title">Checking account</p>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Loading your Mechi player profile</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Early access is only open to signed-in Mechi players.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="card p-4 sm:p-5">
        <div className="flex items-start gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="section-title">Mechi players only</p>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Sign in to get early access</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Your Mechi username is pulled from your player profile automatically.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <Link href="/login?next=/android-testers" className="btn-primary w-full">
            Sign in
          </Link>
          <Link href="/register?next=/android-testers" className="btn-ghost w-full">
            Create Mechi account
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form id="apply" className="card p-4 sm:p-5" onSubmit={handleSubmit} noValidate>
      <div className="flex items-start gap-3 border-b border-[var(--border-color)] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="section-title">Early access</p>
          <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Join the v4.0.1 Android list</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Signed in as @{user.username}.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            className="input"
            value={form.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            placeholder="Ryan Alfred"
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="playEmail">
            Play Store email
          </label>
          <input
            id="playEmail"
            className="input"
            type="email"
            value={form.playEmail}
            onChange={(event) => setField('playEmail', event.target.value)}
            placeholder="you@gmail.com"
            autoComplete="email"
            inputMode="email"
            maxLength={160}
            required
          />
          <p className="input-hint mt-2">This should match the Google account on your Android phone.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="whatsappNumber">
              WhatsApp number
            </label>
            <input
              id="whatsappNumber"
              className="input"
              type="tel"
              value={form.whatsappNumber}
              onChange={(event) => setField('whatsappNumber', event.target.value)}
              placeholder="+254 712 345 678"
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              required
            />
          </div>

          <div>
            <p className="label">Mechi player</p>
            <div className="flex min-h-12 items-center rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 text-sm font-black text-[var(--text-primary)]">
              @{user.username}
            </div>
            <p className="input-hint mt-2">Fetched from your logged-in Mechi profile.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="deviceModel">
              Android phone model
            </label>
            <input
              id="deviceModel"
              className="input"
              value={form.deviceModel}
              onChange={(event) => setField('deviceModel', event.target.value)}
              placeholder="Samsung A24, Redmi Note 12..."
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="androidVersion">
              Android version
            </label>
            <select
              id="androidVersion"
              className="input"
              value={form.androidVersion}
              onChange={(event) => setField('androidVersion', event.target.value)}
            >
              <option value="">Select version</option>
              {ANDROID_VERSIONS.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="input min-h-24 resize-y"
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="Anything we should know before sending your early access link?"
            maxLength={500}
          />
        </div>

        <label className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--brand-teal)]"
            checked={form.canStayOptedIn}
            onChange={(event) => setField('canStayOptedIn', event.target.checked)}
            required
          />
          <span>
            I can use this Play Store account for Mechi v4.0.1 Android early access and receive
            update messages on WhatsApp.
          </span>
        </label>

        {feedback ? <ActionFeedback {...feedback} /> : null}

        <button type="submit" className="btn-primary w-full" disabled={loading || !formIsValid}>
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Get early access
            </>
          )}
        </button>
      </div>
    </form>
  );
}
