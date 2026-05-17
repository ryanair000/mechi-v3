import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  RadioTower,
  ShieldCheck,
} from 'lucide-react';
import { hasAdminAccess } from '@/lib/access';
import { verifyToken } from '@/lib/auth';
import {
  POSTHOG_API_HOST,
  POSTHOG_ENABLED,
  POSTHOG_PROXY_PATH,
  POSTHOG_REGION,
  POSTHOG_SERVER_HOST,
  POSTHOG_UI_HOST,
} from '@/lib/posthog';
import { createServiceClient } from '@/lib/supabase';
import { ObservabilityTestPanel } from './observability-test-panel';

type StatusTone = 'ready' | 'warn' | 'off';

function envEnabled(name: string) {
  return Boolean(process.env[name]?.trim());
}

function statusClass(tone: StatusTone) {
  switch (tone) {
    case 'ready':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'warn':
      return 'bg-amber-500/14 text-amber-300';
    case 'off':
    default:
      return 'bg-red-500/14 text-red-300';
  }
}

function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${statusClass(tone)}`}>
      {label}
    </span>
  );
}

async function requireAdminRole() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    redirect('/admin');
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, phone, role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || !hasAdminAccess(profile)) {
    redirect('/admin');
  }

  return profile;
}

export default async function AdminObservabilityPage() {
  await requireAdminRole();

  const sentryDsnReady = envEnabled('SENTRY_DSN') || envEnabled('NEXT_PUBLIC_SENTRY_DSN');
  const sentryUploadReady = envEnabled('SENTRY_AUTH_TOKEN');
  const sentryOrg = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const sentryProjectUrl =
    sentryOrg && sentryProject ? `https://sentry.io/organizations/${sentryOrg}/projects/${sentryProject}/` : null;
  const sentryTraceSample =
    process.env.SENTRY_TRACES_SAMPLE_RATE ||
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ||
    '0';
  const sentryReplayErrorSample = process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE || '0';

  const statusRows = [
    {
      label: 'PostHog client',
      detail: POSTHOG_ENABLED
        ? `Token present, browser events use ${POSTHOG_API_HOST}`
        : 'NEXT_PUBLIC_POSTHOG_TOKEN is missing',
      tone: POSTHOG_ENABLED ? 'ready' as const : 'off' as const,
    },
    {
      label: 'PostHog server',
      detail: POSTHOG_ENABLED
        ? `Server events send to ${POSTHOG_SERVER_HOST}`
        : 'Server capture will be skipped until the token is configured',
      tone: POSTHOG_ENABLED ? 'ready' as const : 'off' as const,
    },
    {
      label: 'Sentry SDK',
      detail: sentryDsnReady
        ? `DSN present, traces sample ${sentryTraceSample}`
        : 'SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is missing',
      tone: sentryDsnReady ? 'ready' as const : 'off' as const,
    },
    {
      label: 'Sentry sourcemaps',
      detail: sentryUploadReady
        ? 'SENTRY_AUTH_TOKEN present for production sourcemap upload'
        : 'SENTRY_AUTH_TOKEN missing; runtime errors still work but sourcemaps will not upload',
      tone: sentryUploadReady ? 'ready' as const : 'warn' as const,
    },
  ];

  const trackedFlows = [
    'Page views with sensitive query params stripped',
    'Identified signed-in users with role, plan, region, games, and platform properties',
    'Server-side PostHog test events from this admin page',
    'Sentry client, server, edge, router transition, and request error capture',
    'Sentry replay-on-error sampling controlled by env',
  ];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="brand-kicker">Analytics and monitoring</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Observability
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Manage PostHog analytics, Sentry error monitoring, replay sampling, and the payment
                support signal that showed up from the Weekend Cup checkout.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label={POSTHOG_ENABLED ? 'PostHog ready' : 'PostHog off'} tone={POSTHOG_ENABLED ? 'ready' : 'off'} />
            <StatusPill label={sentryDsnReady ? 'Sentry ready' : 'Sentry off'} tone={sentryDsnReady ? 'ready' : 'off'} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {statusRows.map((row) => (
          <div key={row.label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[var(--text-primary)]">{row.label}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{row.detail}</p>
              </div>
              {row.tone === 'ready' ? (
                <CheckCircle2 className="shrink-0 text-[var(--accent-secondary-text)]" size={18} />
              ) : (
                <AlertTriangle className="shrink-0 text-amber-300" size={18} />
              )}
            </div>
          </div>
        ))}
      </div>

      <ObservabilityTestPanel />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
            <BarChart3 size={16} />
            <p className="text-xs font-black uppercase tracking-[0.16em]">Tracked product signals</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)]">
            {trackedFlows.map((flow) => (
              <div key={flow} className="flex items-start gap-3">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--accent-secondary-text)]" />
                <span>{flow}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
            <ShieldCheck size={16} />
            <p className="text-xs font-black uppercase tracking-[0.16em]">Safe configuration</p>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[var(--text-soft)]">PostHog region</dt>
              <dd className="font-bold text-[var(--text-primary)]">{POSTHOG_REGION.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-soft)]">First-party proxy</dt>
              <dd className="font-bold text-[var(--text-primary)]">{POSTHOG_PROXY_PATH}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-soft)]">Sentry replay on error</dt>
              <dd className="font-bold text-[var(--text-primary)]">{sentryReplayErrorSample}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-amber-300">
          <RadioTower size={16} />
          <p className="text-xs font-black uppercase tracking-[0.16em]">Weekend Cup payment signal</p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          The WhatsApp screenshot is consistent with a non-Kenyan number trying an M-PESA option in
          Paystack. The checkout now avoids passing non-Kenyan phone metadata and the registration page
          warns players to use Paybill, Till, Airtel, card, or support when they do not have a Kenyan
          Safaricom number.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href={POSTHOG_UI_HOST} target="_blank" rel="noopener noreferrer" className="btn-outline">
          <ExternalLink size={14} />
          Open PostHog
        </a>
        {sentryProjectUrl ? (
          <a href={sentryProjectUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
            <ExternalLink size={14} />
            Open Sentry
          </a>
        ) : (
          <Link href="/admin/logs" className="btn-outline">
            Audit log
          </Link>
        )}
      </div>
    </div>
  );
}
