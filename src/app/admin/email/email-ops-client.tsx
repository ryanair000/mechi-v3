'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Send,
  Users,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';

type AudienceType = 'all_profiles' | 'manual';

export type EmailCampaignSummary = {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

type CampaignResponse = {
  ok?: boolean;
  dryRun?: boolean;
  error?: string;
  campaignId?: string;
  status?: string;
  audienceType?: AudienceType;
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  skippedByUnsubscribe?: number;
  overLimit?: boolean;
  sendLimit?: number;
  sample?: string[];
};

export default function EmailOpsClient({
  profileEmailCount,
  unsubscribedCount,
  recentCampaigns,
}: {
  profileEmailCount: number;
  unsubscribedCount: number;
  recentCampaigns: EmailCampaignSummary[];
}) {
  const authFetch = useAuthFetch();
  const [audienceType, setAudienceType] = useState<AudienceType>('manual');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResponse | null>(null);

  const payload = (dryRun: boolean) => ({
    audience_type: audienceType,
    recipients,
    subject,
    title,
    body_text: bodyText,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    dry_run: dryRun,
    confirm_text: confirmText,
  });

  const runCampaign = async (dryRun: boolean) => {
    if (dryRun) {
      setPreviewing(true);
    } else {
      setSending(true);
    }
    setResult(null);

    try {
      const response = await authFetch('/api/admin/email/campaign', {
        method: 'POST',
        body: JSON.stringify(payload(dryRun)),
      });
      const data = (await response.json()) as CampaignResponse;
      setResult(data);

      if (!response.ok || !data.ok) {
        toast.error(data.error ?? 'Email campaign failed');
        return;
      }

      toast.success(dryRun ? 'Audience preview ready' : 'Email campaign finished');
    } catch {
      toast.error('Could not reach the email campaign service');
    } finally {
      setPreviewing(false);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-kicker">Email Ops</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Send client mail with delivery records.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Compose once, preview the audience, then send with per-recipient unsubscribe links and
              event tracking.
            </p>
          </div>
          <div className="grid min-w-56 grid-cols-2 gap-2">
            <div className="admin-kpi-card px-4 py-3">
              <p className="section-title">Profile emails</p>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                {profileEmailCount.toLocaleString()}
              </p>
            </div>
            <div className="admin-kpi-card px-4 py-3">
              <p className="section-title">Opted out</p>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                {unsubscribedCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[var(--brand-teal)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Campaign composer</p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Audience</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { key: 'manual' as const, label: 'Manual client list', icon: FileText },
                  { key: 'all_profiles' as const, label: 'All profile emails', icon: Users },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAudienceType(key)}
                    className={`rounded-[0.6rem] border p-3 text-left transition-colors ${
                      audienceType === key
                        ? 'border-[rgba(50,224,196,0.3)] bg-[rgba(50,224,196,0.14)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Icon size={15} />
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {audienceType === 'manual' ? (
              <div>
                <label className="label">Client emails</label>
                <textarea
                  value={recipients}
                  onChange={(event) => setRecipients(event.target.value)}
                  className="input min-h-28 resize-y"
                  placeholder="client@example.com, another@example.com"
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Subject</label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="input"
                  placeholder="Mechi update"
                />
              </div>
              <div>
                <label className="label">Email title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="input"
                  placeholder="What clients see first"
                />
              </div>
            </div>

            <div>
              <label className="label">Message</label>
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                className="input min-h-44 resize-y"
                placeholder="Write the client email body here."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">CTA label</label>
                <input
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  className="input"
                  placeholder="Open Mechi"
                />
              </div>
              <div>
                <label className="label">CTA URL</label>
                <input
                  value={ctaUrl}
                  onChange={(event) => setCtaUrl(event.target.value)}
                  className="input"
                  placeholder="/dashboard"
                />
              </div>
            </div>

            <div className="rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <label className="label">Confirmation</label>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="input"
                placeholder="SEND EMAIL"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runCampaign(true)}
                disabled={previewing || sending}
                className="btn-outline"
              >
                {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                Preview audience
              </button>
              <button
                type="button"
                onClick={() => void runCampaign(false)}
                disabled={previewing || sending}
                className="btn-primary"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send campaign
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-[var(--brand-coral)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Last result</p>
            </div>

            {!result ? (
              <div className="mt-4 rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                Preview or send a campaign to see counts and failures here.
              </div>
            ) : (
              <div className="mt-4 rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <div className="flex items-center gap-2">
                  {result.ok ? (
                    <CheckCircle2 size={16} className="text-[var(--brand-teal)]" />
                  ) : (
                    <AlertCircle size={16} className="text-[var(--brand-coral)]" />
                  )}
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    {result.error ?? (result.dryRun ? 'Audience preview' : 'Campaign result')}
                  </p>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
                  <p>Recipients: {(result.recipientCount ?? 0).toLocaleString()}</p>
                  <p>Sent: {(result.sentCount ?? 0).toLocaleString()}</p>
                  <p>Failed: {(result.failedCount ?? 0).toLocaleString()}</p>
                  <p>Skipped by unsubscribe: {(result.skippedByUnsubscribe ?? 0).toLocaleString()}</p>
                  {result.overLimit ? (
                    <p className="text-[var(--brand-coral)]">
                      Over send limit: {result.sendLimit?.toLocaleString()}
                    </p>
                  ) : null}
                </div>
                {result.sample?.length ? (
                  <div className="mt-4 rounded-[0.55rem] border border-[var(--border-color)] p-3">
                    <p className="section-title">Sample</p>
                    <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                      {result.sample.map((email) => (
                        <p key={email}>{email}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--brand-teal)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Recent campaigns</p>
            </div>

            <div className="mt-4 space-y-3">
              {recentCampaigns.length === 0 ? (
                <div className="rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  No email campaigns have been recorded yet.
                </div>
              ) : (
                recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--text-primary)]">
                          {campaign.subject}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                          {new Date(campaign.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="brand-chip px-2.5 py-1">{campaign.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--text-secondary)]">
                      <p>{campaign.recipient_count.toLocaleString()} recipients</p>
                      <p>{campaign.sent_count.toLocaleString()} sent</p>
                      <p>{campaign.failed_count.toLocaleString()} failed</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
