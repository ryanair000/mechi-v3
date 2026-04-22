'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Send, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { TestsWorkspaceNav } from '@/components/TestsWorkspaceNav';

const MAX_IMAGE_SIZE_MB = 4;

export default function ReportIssueClient() {
  const { user } = useAuth();
  const [pagePath, setPagePath] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    if (!screenshot) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(screenshot);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [screenshot]);

  const resetForm = () => {
    setPagePath('');
    setPageUrl('');
    setDescription('');
    setScreenshot(null);
    setPreviewUrl(null);
    setSubmittedReportId(null);
    setFeedback(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pagePath.trim()) {
      setFeedback({
        tone: 'error',
        title: 'Add the page or feature first.',
        detail: 'A short route like /dashboard or /tournaments helps the team triage faster.',
      });
      return;
    }

    if (!description.trim()) {
      setFeedback({
        tone: 'error',
        title: 'Describe what went wrong.',
        detail: 'Include the bug, visual issue, or broken behavior you noticed.',
      });
      return;
    }

    if (!screenshot) {
      setFeedback({
        tone: 'error',
        title: 'Attach a screenshot.',
        detail: 'A quick capture of the issue helps us verify and prioritize it.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Submitting report...',
      detail: 'Uploading the screenshot and saving the issue details now.',
    });

    try {
      const formData = new FormData();
      formData.append('page_path', pagePath.trim());
      if (pageUrl.trim()) {
        formData.append('page_url', pageUrl.trim());
      }
      formData.append('description', description.trim());
      formData.append('screenshot', screenshot);

      const response = await fetch('/api/test-reports', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; reportId?: string }
        | null;

      if (!response.ok || !data?.reportId) {
        setFeedback({
          tone: 'error',
          title: 'Could not submit the issue report.',
          detail: data?.error ?? 'Please try again in a moment.',
        });
        return;
      }

      setSubmittedReportId(data.reportId);
      setFeedback({
        tone: 'success',
        title: 'Issue report sent.',
        detail: 'The screenshot and notes are now queued for review.',
      });
      setPagePath('');
      setPageUrl('');
      setDescription('');
      setScreenshot(null);
    } catch {
      setFeedback({
        tone: 'error',
        title: 'Could not submit the issue report.',
        detail: 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-base manual-tests-shell">
      <section className="landing-shell py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
          <div className="card circuit-panel overflow-hidden p-6 sm:p-7">
            <TestsWorkspaceNav current="report" />

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-start">
              <div className="max-w-3xl">
                <p className="section-title">Issue Intake</p>
                <h1 className="mt-3 text-[2.1rem] font-black leading-[0.98] text-[var(--text-primary)] sm:text-[3rem]">
                  Report a tester issue without leaving the flow.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Drop the page, explain what broke, and attach a screenshot. Logged-in testers are linked automatically. Anonymous reports still go through cleanly.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="brand-chip px-3 py-1">
                    {user ? `Signed in as @${user.username}` : 'Anonymous submission is allowed'}
                  </span>
                  <span className="brand-chip-coral px-3 py-1">
                    Screenshot required
                  </span>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                  <ShieldCheck size={16} />
                  <p className="section-title !mb-0">Best signal</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                  <li>Use the exact route, feature name, or tournament slug when you can.</li>
                  <li>State what you expected and what actually happened in one short block.</li>
                  <li>Keep the screenshot under {MAX_IMAGE_SIZE_MB}MB so the upload stays quick.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="card p-5 sm:p-6">
              {submittedReportId ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-[var(--text-primary)]">Report captured</p>
                      <p className="text-sm leading-6 text-[var(--text-secondary)]">
                        Reference ID {submittedReportId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {feedback ? (
                    <ActionFeedback
                      tone={feedback.tone}
                      title={feedback.title}
                      detail={feedback.detail}
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={resetForm} className="btn-primary">
                      Submit another issue
                    </button>
                    <a href="/manual-tests" className="btn-ghost">
                      Back to checklist
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="page-path" className="label">
                      Page or feature
                    </label>
                    <input
                      id="page-path"
                      type="text"
                      value={pagePath}
                      onChange={(event) => setPagePath(event.target.value)}
                      placeholder="e.g. /dashboard, /tournaments, lobby detail"
                      className="input"
                      maxLength={160}
                    />
                  </div>

                  <div>
                    <label htmlFor="page-url" className="label">
                      Full URL
                    </label>
                    <input
                      id="page-url"
                      type="url"
                      value={pageUrl}
                      onChange={(event) => setPageUrl(event.target.value)}
                      placeholder="Optional. Paste the exact page URL if it helps."
                      className="input"
                      maxLength={240}
                    />
                  </div>

                  <div>
                    <label htmlFor="issue-description" className="label">
                      What happened?
                    </label>
                    <textarea
                      id="issue-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the issue, what you expected, and anything that helps reproduce it."
                      className="input min-h-[160px] resize-y py-3"
                      maxLength={2000}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="label mb-0">Screenshot</p>

                    {previewUrl ? (
                      <div className="space-y-3">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)]">
                          <img
                            src={previewUrl}
                            alt="Issue screenshot preview"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <label className="btn-ghost cursor-pointer">
                            <ImagePlus size={14} />
                            Change screenshot
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setScreenshot(file);
                                event.target.value = '';
                              }}
                              disabled={submitting}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setScreenshot(null)}
                            className="btn-ghost text-[var(--brand-coral)] hover:text-[var(--accent-primary-hover)]"
                            disabled={submitting}
                          >
                            <X size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[1.2rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] px-5 py-8 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                            <ImagePlus size={22} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Upload screenshot</p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                              PNG, JPG, or WEBP up to {MAX_IMAGE_SIZE_MB}MB
                            </p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setScreenshot(file);
                            event.target.value = '';
                          }}
                          disabled={submitting}
                        />
                      </label>
                    )}
                  </div>

                  {feedback ? (
                    <ActionFeedback
                      tone={feedback.tone}
                      title={feedback.title}
                      detail={feedback.detail}
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={submitting} className="btn-primary">
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Submit issue
                    </button>
                    <a href="/manual-tests" className="btn-ghost">
                      Back to checklist
                    </a>
                  </div>
                </form>
              )}
            </div>

            <div className="card p-5 sm:p-6">
              <p className="section-title">What gets stored</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>The issue text, affected page, screenshot URL, and lightweight metadata such as host, referrer, and browser user agent.</p>
                <p>Status starts as <span className="font-semibold text-[var(--text-primary)]">new</span> so the review team can triage it later.</p>
                <p>If you are logged in, the report is linked to your Mechi account automatically. If not, the submission still lands in the review queue.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
