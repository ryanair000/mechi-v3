'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';

type TesterForm = {
  playEmail: string;
};

const initialForm: TesterForm = {
  playEmail: '',
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AndroidTestersClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [form, setForm] = useState<TesterForm>(initialForm);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const formIsValid =
    Boolean(user) &&
    isValidEmail(form.playEmail);

  const setField = <Key extends keyof TesterForm>(field: Key, value: TesterForm[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setFeedback({
        tone: 'error',
        title: 'Sign in first.',
        detail: 'Only logged-in PlayMechi players can join the v4.0.1 Android early access list.',
      });
      return;
    }

    if (!formIsValid) {
      setFeedback({
        tone: 'error',
        title: 'Almost there.',
        detail: 'Add the Google account email you use with Play Store.',
      });
      return;
    }

    setLoading(true);
    setRedirecting(false);
    setFeedback({
      tone: 'loading',
      title: 'Locking in your spot...',
      detail: 'Saving your Google Play account for the PlayMechi v4.0.1 invite.',
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

      setSaved(true);
      setRedirecting(true);
      setFeedback({
        tone: 'success',
        title: 'You are on the early list.',
        detail:
          data.message ??
          'Your Google Play account is saved for the PlayMechi v4.0.1 tester invite. Open your dashboard for the next move.',
      });
      window.setTimeout(() => {
        router.push('/dashboard?androidTester=saved');
      }, 700);
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
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Loading your PlayMechi player profile</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Early access is only open to signed-in PlayMechi players.
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
            <p className="section-title">PlayMechi players only</p>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Sign in to get early access</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              We will use your PlayMechi profile details automatically.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <Link href="/login?next=/android-testers" className="btn-primary w-full">
            Sign in
          </Link>
          <Link href="/register?next=/android-testers" className="btn-ghost w-full">
            Create PlayMechi account
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
          <p className="section-title">Google Play invite</p>
          <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Add your Play Store email</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Signed in as @{user.username}. We will use your PlayMechi profile for contact details.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="label" htmlFor="playEmail">
            Google Play account email
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
          <p className="input-hint mt-2">
            Use the Google account signed in on the Android phone that will install PlayMechi.
          </p>
        </div>

        <p className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
          Already known: your PlayMechi username and account phone. No need to enter them again.
        </p>

        {feedback ? <ActionFeedback {...feedback} /> : null}

        {saved ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard?androidTester=saved')}
              className="btn-primary w-full"
            >
              {redirecting ? 'Opening dashboard...' : 'Open dashboard'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setRedirecting(false);
                setFeedback(null);
              }}
              className="btn-ghost w-full"
              disabled={redirecting}
            >
              Update Play email
            </button>
          </div>
        ) : (
          <button type="submit" className="btn-primary w-full" disabled={loading || !formIsValid}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Join tester list
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
