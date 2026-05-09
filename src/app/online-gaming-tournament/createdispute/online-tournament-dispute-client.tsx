'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { Card } from '@/components/ui/card';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import {
  ONLINE_TOURNAMENT_DISPUTE_API_PATH,
  ONLINE_TOURNAMENT_DISPUTE_CATEGORIES,
  ONLINE_TOURNAMENT_DISPUTE_PATH,
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  type OnlineTournamentDisputeCategory,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  getCustomerWhatsAppSupportUrl,
} from '@/lib/social-links';

type DisputeRegistration = {
  id: string;
  game: OnlineTournamentGameKey;
  game_label: string;
  in_game_username: string;
  check_in_status: string;
  eligibility_status: string;
};

type DisputeSubmission = {
  id: string;
  game: OnlineTournamentGameKey;
  game_label: string;
  label: string;
  status: string;
  fixture_id: string | null;
  created_at: string;
};

type DisputeFixture = {
  id: string;
  game: OnlineTournamentGameKey;
  game_label: string;
  label: string;
  status: string;
};

type DisputeEntry = {
  id: string;
  game: OnlineTournamentGameKey;
  game_label: string;
  category: OnlineTournamentDisputeCategory;
  category_label: string;
  title: string;
  reporter_contact: string | null;
  evidence_url: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  reason: string;
  related_label: string | null;
  created_at: string;
};

type DisputeSummary = {
  registrations: DisputeRegistration[];
  submissions: DisputeSubmission[];
  fixtures: DisputeFixture[];
  disputes: DisputeEntry[];
};

const EMPTY_SUMMARY: DisputeSummary = {
  registrations: [],
  submissions: [],
  fixtures: [],
  disputes: [],
};

const SUPPORT_URL = getCustomerWhatsAppSupportUrl(
  'Hi PlayMechi, I need help with a tournament dispute or issue.'
);

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getDisputeStatusClassName(status: DisputeEntry['status']) {
  switch (status) {
    case 'resolved':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'dismissed':
      return 'bg-red-500/14 text-red-300';
    case 'open':
    default:
      return 'bg-amber-500/14 text-amber-300';
  }
}

export function OnlineTournamentDisputeClient() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { user, loading: authLoading } = useAuth();
  const signInHref = getLoginPath(ONLINE_TOURNAMENT_DISPUTE_PATH);
  const createAccountHref = getRegisterPath({ next: ONLINE_TOURNAMENT_DISPUTE_PATH });
  const [summary, setSummary] = useState<DisputeSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);
  const [selectedGame, setSelectedGame] = useState<OnlineTournamentGameKey>('pubgm');
  const [category, setCategory] = useState<OnlineTournamentDisputeCategory>('wrongdoing');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [resultSubmissionId, setResultSubmissionId] = useState('');
  const [fixtureId, setFixtureId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(createAccountHref);
    }
  }, [authLoading, createAccountHref, router, user]);

  useEffect(() => {
    if (!reporterContact.trim() && user) {
      const fallbackContact =
        user.whatsapp_number?.trim() || user.phone?.trim() || user.email?.trim() || '';
      if (fallbackContact) {
        setReporterContact(fallbackContact);
      }
    }
  }, [reporterContact, user]);

  useEffect(() => {
    if (summary.registrations.length === 0) {
      return;
    }

    const selectedGameStillValid = summary.registrations.some(
      (registration) => registration.game === selectedGame
    );

    if (!selectedGameStillValid) {
      setSelectedGame(summary.registrations[0].game);
    }
  }, [selectedGame, summary.registrations]);

  const loadSummary = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(ONLINE_TOURNAMENT_DISPUTE_API_PATH, { method: 'GET' });
      const data = (await res.json()) as DisputeSummary & { error?: string };

      if (!res.ok) {
        const message = data.error ?? 'Could not load the dispute form';
        setFeedback({
          tone: 'error',
          title: 'The dispute desk did not load.',
          detail: message,
        });
        toast.error(message);
        return;
      }

      setSummary(data);
      setFeedback(null);
    } catch {
      setFeedback({
        tone: 'error',
        title: 'The dispute desk did not load.',
        detail: 'Please refresh and try again.',
      });
      toast.error('Could not load the dispute form');
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadSummary();
  }, [authLoading, loadSummary, user]);

  const currentRegistration = summary.registrations.find(
    (registration) => registration.game === selectedGame
  );
  const submissionOptions = summary.submissions.filter(
    (submission) => submission.game === selectedGame
  );
  const fixtureOptions = summary.fixtures.filter((fixture) => fixture.game === selectedGame);

  const handleGameChange = (value: string) => {
    setSelectedGame(value as OnlineTournamentGameKey);
    setResultSubmissionId('');
    setFixtureId('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentRegistration) {
      setFeedback({
        tone: 'error',
        title: 'Register for the tournament first.',
        detail: 'The dispute desk is only for players already in the PlayMechi bracket or room flow.',
      });
      return;
    }

    if (title.trim().length < 4) {
      setFeedback({
        tone: 'error',
        title: 'Add a short title.',
        detail: 'A clear title helps ops scan the queue quickly.',
      });
      return;
    }

    if (reason.trim().length < 20) {
      setFeedback({
        tone: 'error',
        title: 'Add a few more details.',
        detail: 'Explain what happened, who was involved, and when it happened.',
      });
      return;
    }

    if (reporterContact.trim().length < 6) {
      setFeedback({
        tone: 'error',
        title: 'Add a contact channel.',
        detail: 'Use WhatsApp, phone, or email so the team can follow up fast.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Sending your report to the tournament desk.',
      detail: 'We are logging the issue now.',
    });

    try {
      const res = await authFetch(ONLINE_TOURNAMENT_DISPUTE_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: selectedGame,
          category,
          title,
          reason,
          reporter_contact: reporterContact,
          evidence_url: evidenceUrl,
          result_submission_id: resultSubmissionId || null,
          fixture_id: fixtureId || null,
        }),
      });
      const data = (await res.json()) as DisputeSummary & { error?: string };

      if (!res.ok) {
        const message = data.error ?? 'Could not submit the dispute';
        setFeedback({
          tone: 'error',
          title: 'The report did not go through.',
          detail: message,
        });
        toast.error(message);
        return;
      }

      setSummary(data);
      setTitle('');
      setReason('');
      setEvidenceUrl('');
      setResultSubmissionId('');
      setFixtureId('');
      setFeedback({
        tone: 'success',
        title: 'Your tournament issue is in the queue.',
        detail:
          'Keep your screenshots, WhatsApp messages, or lobby proof ready in case ops asks for follow-up.',
      });
      toast.success('Dispute report submitted');
    } catch {
      setFeedback({
        tone: 'error',
        title: 'The report did not go through.',
        detail: 'Check your connection and try again.',
      });
      toast.error('Could not submit the dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <HomeFloatingHeader
        navItems={[
          { href: ONLINE_TOURNAMENT_PUBLIC_PATH, label: 'HOME' },
          { href: ONLINE_TOURNAMENT_REGISTRATION_PATH, label: 'REGISTER' },
          { href: ONLINE_TOURNAMENT_DISPUTE_PATH, label: 'REPORT' },
        ]}
        signInHref={signInHref}
        joinHref={createAccountHref}
      />

      <main className="landing-shell pb-12 pt-8 sm:pb-16 sm:pt-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:items-start">
          <div className="space-y-5">
            <div>
              <p className="section-title">Tournament dispute desk</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
                Report cheating, result issues, or any tournament problem fast.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Use this form if something went wrong during PlayMechi. Share the game, what happened,
                and the best way to reach you so the team can review it cleanly.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="brand-chip px-3 py-1">Logged-in player reports only</span>
                <span className="brand-chip-coral px-3 py-1">Keep proof ready</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-control)] border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)] px-4 py-2 text-sm font-semibold text-[var(--accent-secondary-text)] transition hover:border-[rgba(50,224,196,0.34)] hover:bg-[rgba(50,224,196,0.12)]"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    WhatsApp support: {CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <a href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-ghost">
                  Back to registration
                </a>
              </div>
            </div>

            <Card className="border-white/10 bg-[rgba(10,18,31,0.7)] p-5 text-[var(--text-primary)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md sm:p-6">
              <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                <ShieldAlert className="h-4 w-4" />
                <p className="section-title !mb-0">Best signal</p>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <li>Use the exact in-game names, room details, or scoreline when you have them.</li>
                <li>State what happened, who was involved, and what outcome you believe is fair.</li>
                <li>Paste any Drive, Cloudinary, or other proof link if the evidence already exists online.</li>
              </ul>
            </Card>
          </div>

          <Card className="border-white/10 bg-[rgba(10,18,31,0.78)] p-5 text-[var(--text-primary)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md sm:p-6">
            {authLoading || loading ? (
              <div className="flex min-h-80 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-secondary-text)]" />
              </div>
            ) : summary.registrations.length === 0 ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">No PlayMechi registration found on this account.</p>
                    <p className="mt-1 text-sm leading-6">
                      Register for the tournament first, or message support if the wrong Mechi account was used.
                    </p>
                  </div>
                </div>

                {feedback ? <ActionFeedback {...feedback} /> : null}

                <div className="flex flex-wrap gap-3">
                  <a href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-primary">
                    Register for PlayMechi
                  </a>
                  <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Ask support on WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-title">Report as @{user?.username}</p>
                    <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                      Open a PlayMechi issue cleanly.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Choose the game, add the problem clearly, and include a follow-up contact.
                    </p>
                  </div>
                  <span className="brand-chip px-3 py-1">
                    {summary.disputes.filter((dispute) => dispute.status === 'open').length} open reports
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="label">Game</span>
                      <select
                        value={selectedGame}
                        onChange={(event) => handleGameChange(event.target.value)}
                        disabled={submitting}
                        className="input"
                      >
                        {summary.registrations.map((registration) => (
                          <option key={registration.id} value={registration.game}>
                            {registration.game_label} - {registration.in_game_username}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label">Issue type</span>
                      <select
                        value={category}
                        onChange={(event) =>
                          setCategory(event.target.value as OnlineTournamentDisputeCategory)
                        }
                        disabled={submitting}
                        className="input"
                      >
                        {ONLINE_TOURNAMENT_DISPUTE_CATEGORIES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-[var(--radius-card)] border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                    <p className="font-black text-[var(--text-primary)]">
                      Registered tag: {currentRegistration?.in_game_username}
                    </p>
                    <p className="mt-1">
                      Check-in status: {currentRegistration?.check_in_status}. Eligibility review:{' '}
                      {currentRegistration?.eligibility_status}.
                    </p>
                  </div>

                  <label className="block">
                    <span className="label">Issue title</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      disabled={submitting}
                      className="input"
                      maxLength={120}
                      placeholder="Example: Opponent used a different account"
                    />
                  </label>

                  <label className="block">
                    <span className="label">Best contact for follow-up</span>
                    <input
                      value={reporterContact}
                      onChange={(event) => setReporterContact(event.target.value)}
                      disabled={submitting}
                      className="input"
                      maxLength={120}
                      placeholder="WhatsApp number, phone, or email"
                    />
                  </label>

                  <label className="block">
                    <span className="label">What happened?</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={submitting}
                      className="input min-h-[170px] resize-y py-3"
                      maxLength={2400}
                      placeholder="Explain the issue, who was involved, when it happened, and what proof exists."
                    />
                  </label>

                  <label className="block">
                    <span className="label">Evidence link</span>
                    <input
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                      disabled={submitting}
                      className="input"
                      maxLength={500}
                      placeholder="Optional. Paste a Drive, image, or video link if you already uploaded proof."
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="label">Result submission</span>
                      <select
                        value={resultSubmissionId}
                        onChange={(event) => setResultSubmissionId(event.target.value)}
                        disabled={submitting}
                        className="input"
                      >
                        <option value="">Not tied to a submission</option>
                        {submissionOptions.map((submission) => (
                          <option key={submission.id} value={submission.id}>
                            {submission.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label">Fixture / head-to-head match</span>
                      <select
                        value={fixtureId}
                        onChange={(event) => setFixtureId(event.target.value)}
                        disabled={submitting || fixtureOptions.length === 0}
                        className="input"
                      >
                        <option value="">
                          {fixtureOptions.length === 0 ? 'No linked fixture right now' : 'Not tied to a fixture'}
                        </option>
                        {fixtureOptions.map((fixture) => (
                          <option key={fixture.id} value={fixture.id}>
                            {fixture.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {feedback ? <ActionFeedback {...feedback} /> : null}

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={submitting} className="btn-primary">
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Send to tournament desk
                    </button>
                    <a href={ONLINE_TOURNAMENT_PUBLIC_PATH} className="btn-ghost">
                      Back to PlayMechi
                    </a>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--brand-coral)]" />
              <p className="section-title !mb-0">Recent reports</p>
            </div>

            <div className="mt-4 space-y-4">
              {summary.disputes.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  No tournament issues submitted from this account yet.
                </p>
              ) : (
                summary.disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{dispute.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          {dispute.game_label} • {dispute.category_label}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${getDisputeStatusClassName(dispute.status)}`}
                      >
                        {dispute.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{dispute.reason}</p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-soft)]">
                      <span>Submitted {formatDateTime(dispute.created_at)}</span>
                      {dispute.related_label ? <span>{dispute.related_label}</span> : null}
                      {dispute.evidence_url ? (
                        <a
                          href={dispute.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent-secondary-text)]"
                        >
                          Open evidence
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[var(--accent-secondary-text)]" />
              <p className="section-title !mb-0">Urgent follow-up</p>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                If the issue affects a live room, active fixture, or suspected cheating in progress,
                submit the form and also message support immediately.
              </p>
              <p>
                Use the same contact details on both sides so ops can tie the dispute report back to
                your tournament entry quickly.
              </p>
            </div>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-5 inline-flex"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp support
            </a>
          </Card>
        </section>
      </main>
    </div>
  );
}
