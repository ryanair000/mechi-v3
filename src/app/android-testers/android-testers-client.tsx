'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';

type TesterForm = {
  fullName: string;
  playEmail: string;
  whatsappNumber: string;
  mechiUsername: string;
  deviceModel: string;
  androidVersion: string;
  notes: string;
  canStayOptedIn: boolean;
};

const initialForm: TesterForm = {
  fullName: '',
  playEmail: '',
  whatsappNumber: '',
  mechiUsername: '',
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
  const [form, setForm] = useState<TesterForm>(initialForm);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const [loading, setLoading] = useState(false);

  const formIsValid =
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
      const response = await fetch('/api/android-testers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            Use the Google account already signed in on Play Store.
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
            <label className="label" htmlFor="mechiUsername">
              Mechi username
            </label>
            <input
              id="mechiUsername"
              className="input"
              value={form.mechiUsername}
              onChange={(event) => setField('mechiUsername', event.target.value)}
              placeholder="Optional"
              autoComplete="username"
              maxLength={32}
            />
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
