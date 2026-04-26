import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import { TestsWorkspaceNav } from '@/components/TestsWorkspaceNav';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { TESTS_URL } from '@/app/manual-tests/manual-test-kit';

type ReportStatus = 'new' | 'triaged' | 'in_progress' | 'resolved' | 'closed';

type TestIssueReport = {
  id: string;
  user_id: string | null;
  page_path: string;
  page_url: string | null;
  description: string;
  screenshot_url: string;
  status: ReportStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ResultsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const STATUS_OPTIONS: Array<{ value: 'all' | ReportStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const metadata: Metadata = {
  title: 'Test Issue Results | Mechi',
  description: 'Review submitted Mechi tester issue reports and screenshots.',
  alternates: {
    canonical: `${TESTS_URL}/results`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

function normalizeStatus(value: string | string[] | undefined): 'all' | ReportStatus {
  const statusValue = Array.isArray(value) ? value[0] : value;

  if (
    statusValue === 'new' ||
    statusValue === 'triaged' ||
    statusValue === 'in_progress' ||
    statusValue === 'resolved' ||
    statusValue === 'closed'
  ) {
    return statusValue;
  }

  return 'all';
}

function getMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

function getStatusClass(status: ReportStatus) {
  if (status === 'new') {
    return 'border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]';
  }

  if (status === 'resolved' || status === 'closed') {
    return 'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]';
  }

  return 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)]';
}

async function getResultsAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    redirect('/login?next=/results');
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', payload.sub)
    .single();

  return {
    allowed: Boolean(profile && !profile.is_banned && profile.role === 'admin'),
    supabase,
  };
}

async function getReportCount(
  supabase: ReturnType<typeof createServiceClient>,
  status: 'all' | ReportStatus
) {
  let countQuery = supabase.from('test_issue_reports').select('id', {
    count: 'exact',
    head: true,
  });

  if (status !== 'all') {
    countQuery = countQuery.eq('status', status);
  }

  const { count } = await countQuery;
  return count ?? 0;
}

async function markReportFixed(formData: FormData) {
  'use server';

  const reportId = String(formData.get('report_id') ?? '').trim();
  if (!reportId) {
    return;
  }

  const access = await getResultsAccess();
  if (!access.allowed) {
    return;
  }

  await access.supabase
    .from('test_issue_reports')
    .update({ status: 'resolved' })
    .eq('id', reportId);

  revalidatePath('/results');
}

function RestrictedResults() {
  return (
    <div className="page-base manual-tests-shell">
      <section className="landing-shell py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
          <div className="card circuit-panel overflow-hidden p-6 sm:p-7">
            <TestsWorkspaceNav current="results" />

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="section-title">Restricted</p>
                <h1 className="mt-3 text-[2rem] font-black leading-tight text-[var(--text-primary)] sm:text-[2.8rem]">
                  Test report results are admin-only.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Submitted reports can include screenshots and tester context, so this page only opens
                  for Mechi admin accounts.
                </p>
              </div>
              <a href="/manual-tests" className="btn-ghost w-fit">
                Back to checklist
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const [{ status }, access] = await Promise.all([searchParams, getResultsAccess()]);

  if (!access.allowed) {
    return <RestrictedResults />;
  }

  const activeStatus = normalizeStatus(status);
  let reportQuery = access.supabase
    .from('test_issue_reports')
    .select(
      'id, user_id, page_path, page_url, description, screenshot_url, status, metadata, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (activeStatus !== 'all') {
    reportQuery = reportQuery.eq('status', activeStatus);
  }

  const [{ data: reportsData, error }, countEntries] = await Promise.all([
    reportQuery,
    Promise.all(
      STATUS_OPTIONS.map(async (option) => {
        const count = await getReportCount(access.supabase, option.value);
        return [option.value, count] as const;
      })
    ),
  ]);

  const reports = (reportsData ?? []) as TestIssueReport[];
  const statusCounts = new Map<string, number>(countEntries);
  const totalCount = statusCounts.get('all') ?? 0;
  const newCount = statusCounts.get('new') ?? 0;
  const openCount =
    newCount + (statusCounts.get('triaged') ?? 0) + (statusCounts.get('in_progress') ?? 0);

  return (
    <div className="page-base manual-tests-shell">
      <section className="landing-shell py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
          <div className="card circuit-panel overflow-hidden p-6 sm:p-7">
            <TestsWorkspaceNav current="results" />

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
              <div>
                <p className="section-title">Review queue</p>
                <h1 className="mt-3 text-[2.1rem] font-black leading-[0.98] text-[var(--text-primary)] sm:text-[3rem]">
                  Submitted tester reports.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Check the newest issue reports, open screenshots, and scan the page context testers
                  submitted from the `/report` flow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.72)] px-4 py-4 shadow-[var(--shadow-soft)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Total captured
                  </p>
                  <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{totalCount}</p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(255,255,255,0.72)] px-4 py-4 shadow-[var(--shadow-soft)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Open queue
                  </p>
                  <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{openCount}</p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.08)] px-4 py-4 shadow-[var(--shadow-soft)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-coral)]">
                    New
                  </p>
                  <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{newCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = activeStatus === option.value;
                const count =
                  option.value === 'all' ? totalCount : statusCounts.get(option.value) ?? 0;
                const href = option.value === 'all' ? '/results' : `/results?status=${option.value}`;

                return (
                  <a
                    key={option.value}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.22)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {option.label}
                    <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] text-[var(--text-soft)]">
                      {count}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="card border-[rgba(255,107,107,0.24)] p-5 sm:p-6">
              <div className="flex items-start gap-3 text-[var(--brand-coral)]">
                <AlertTriangle size={18} className="mt-1 shrink-0" />
                <div>
                  <p className="font-black text-[var(--text-primary)]">Could not load reports.</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {error.message}
                  </p>
                </div>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]">
                <Inbox size={24} />
              </div>
              <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">No reports here yet.</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                New submissions from the issue report form will appear here as soon as they are saved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reporterUsername = getMetadataText(report.metadata, 'reporter_username');
                const reporterRole = getMetadataText(report.metadata, 'reporter_role');
                const screenshotName = getMetadataText(report.metadata, 'screenshot_name');

                return (
                  <article
                    key={report.id}
                    className="card overflow-hidden p-0"
                  >
                    <div className="grid gap-0 lg:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)]">
                      <a
                        href={report.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block min-h-[220px] overflow-hidden bg-[var(--surface-elevated)]"
                      >
                        <Image
                          src={report.screenshot_url}
                          alt={`Screenshot for ${report.page_path}`}
                          fill
                          sizes="(min-width: 1024px) 42vw, 100vw"
                          unoptimized
                          className="h-full max-h-[360px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                          <ImageIcon size={13} />
                          Open screenshot
                        </span>
                      </a>

                      <div className="flex flex-col gap-5 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusClass(report.status)}`}
                              >
                                {STATUS_LABELS[report.status]}
                              </span>
                              <span className="brand-chip px-2.5 py-1">
                                {report.id.slice(0, 8)}
                              </span>
                            </div>
                            <h2 className="mt-3 break-words text-xl font-black text-[var(--text-primary)]">
                              {report.page_path}
                            </h2>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-soft)]">
                            <CalendarClock size={14} />
                            {formatDate(report.created_at)}
                          </div>
                        </div>

                        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-secondary)]">
                          {report.description}
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                              Reporter
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                              {reporterUsername ? `@${reporterUsername}` : 'Anonymous'}
                            </p>
                            {reporterRole ? (
                              <p className="mt-1 text-xs text-[var(--text-soft)]">{reporterRole}</p>
                            ) : null}
                          </div>

                          <div className="rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                              Updated
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                              {formatDate(report.updated_at)}
                            </p>
                            {screenshotName ? (
                              <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                                {screenshotName}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {report.status !== 'resolved' && report.status !== 'closed' ? (
                            <form action={markReportFixed}>
                              <input type="hidden" name="report_id" value={report.id} />
                              <button type="submit" className="btn-primary">
                                <CheckCircle2 size={14} />
                                Fixed issue
                              </button>
                            </form>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] px-3 py-2 text-sm font-semibold text-[var(--accent-secondary-text)]">
                              <CheckCircle2 size={14} />
                              Fixed
                            </span>
                          )}
                          {report.page_url ? (
                            <a
                              href={report.page_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost"
                            >
                              <ExternalLink size={14} />
                              Open reported URL
                            </a>
                          ) : null}
                          <a
                            href={report.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                          >
                            <ImageIcon size={14} />
                            View proof
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
