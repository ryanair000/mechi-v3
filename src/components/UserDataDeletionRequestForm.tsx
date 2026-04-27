'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';

const SUPPORT_EMAIL = 'support@mechi.club';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasPhoneLikeDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function UserDataDeletionRequestForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPhone('');
    setNote('');
    setConfirmed(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedNote = note.trim();

    if (!trimmedUsername) {
      setFeedback({
        tone: 'error',
        title: 'Add your Mechi username first.',
        detail: 'We use it to locate the account that should be reviewed for deletion.',
      });
      return;
    }

    if (!trimmedEmail && !trimmedPhone) {
      setFeedback({
        tone: 'error',
        title: 'Add an email or phone number.',
        detail: 'We need at least one account contact so support can verify ownership.',
      });
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFeedback({
        tone: 'error',
        title: 'Enter a valid email address.',
        detail: 'Use the email linked to your Mechi account if you have it.',
      });
      return;
    }

    if (trimmedPhone && !hasPhoneLikeDigits(trimmedPhone)) {
      setFeedback({
        tone: 'error',
        title: 'Enter a valid phone number.',
        detail: 'Include the full number or country code if that is how it appears on your account.',
      });
      return;
    }

    if (!confirmed) {
      setFeedback({
        tone: 'error',
        title: 'Confirm the deletion request terms.',
        detail: 'Please acknowledge the identity-check and data-retention note before submitting.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Submitting your deletion request...',
      detail: 'We are sending the request to the Mechi support team now.',
    });

    try {
      const response = await fetch('/api/user-data-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          phone: trimmedPhone,
          note: trimmedNote,
          confirmed,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; requestId?: string; message?: string }
        | null;

      if (!response.ok || !data?.requestId) {
        setFeedback({
          tone: 'error',
          title: 'We could not submit the request right now.',
          detail:
            data?.error ??
            `Please try again in a moment or email ${SUPPORT_EMAIL} with your username and account contact details.`,
        });
        return;
      }

      setSubmittedRequestId(data.requestId);
      setFeedback({
        tone: 'success',
        title: 'Deletion request received.',
        detail:
          data.message ??
          'Support will review the request, confirm ownership if needed, and follow up using the contact details you provided.',
      });
      resetForm();
    } catch {
      setFeedback({
        tone: 'error',
        title: 'Network issue while sending the request.',
        detail: `Please try again or email ${SUPPORT_EMAIL} directly if the problem continues.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card overflow-hidden p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:items-start">
        <div className="max-w-3xl">
          <p className="section-title">Online deletion request</p>
          <h2 className="mt-3 text-[1.8rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.4rem]">
            Submit an account deletion request from this page.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            Use the form to send your Mechi username and account contact details directly to the
            support team. This public URL is suitable for Google Play review and for users who need
            a clear account-deletion path outside the app.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="brand-chip px-3 py-1">Public request URL</span>
            <span className="brand-chip-coral px-3 py-1">Identity check may follow</span>
          </div>

          <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <ShieldCheck size={16} />
              <p className="section-title !mb-0">What to include</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <li>Your Mechi username so we can find the account quickly.</li>
              <li>The email address or phone number linked to that account.</li>
              <li>An optional note if you need to point out the exact profile or support context.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.76)] p-5 shadow-[var(--shadow-soft)]">
          {submittedRequestId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-lg font-black text-[var(--text-primary)]">
                    Request logged
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Reference {submittedRequestId}
                  </p>
                </div>
              </div>

              {feedback ? <ActionFeedback {...feedback} /> : null}

              <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>
                  Keep your request reference in case support asks for it while verifying account
                  ownership.
                </p>
                <p>
                  Need to reach the team directly? Email{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="brand-link-coral font-semibold">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmittedRequestId(null);
                  setFeedback(null);
                }}
                className="btn-primary"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="deletion-username" className="label">
                  Mechi username
                </label>
                <input
                  id="deletion-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your in-app username"
                  className="input"
                  autoComplete="username"
                  maxLength={40}
                />
              </div>

              <div>
                <label htmlFor="deletion-email" className="label">
                  Account email
                </label>
                <input
                  id="deletion-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Optional, but helpful for support follow-up"
                  className="input"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={120}
                />
              </div>

              <div>
                <label htmlFor="deletion-phone" className="label">
                  Account phone number
                </label>
                <input
                  id="deletion-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optional if you already added email"
                  className="input"
                  autoComplete="tel"
                  maxLength={24}
                />
              </div>

              <div>
                <label htmlFor="deletion-note" className="label">
                  Extra note
                </label>
                <textarea
                  id="deletion-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional. Add anything that helps us identify the account or understand the request."
                  className="input min-h-[140px] resize-y py-3"
                  maxLength={1200}
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--border-color)]"
                />
                <span>
                  I understand Mechi may ask me to verify account ownership before deleting data,
                  and that some billing, fraud, moderation, or dispute records may be retained when
                  legally or operationally required.
                </span>
              </label>

              {feedback ? <ActionFeedback {...feedback} /> : null}

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending request...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Submit deletion request
                    </>
                  )}
                </button>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=User%20Data%20Deletion%20Request`}
                  className="btn-ghost"
                >
                  <Mail size={14} />
                  Email support instead
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
