'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, MessageCircle, Radio, Send } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';

const WHATSAPP_GROUP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ??
  'https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7';

type TestMode = 'hello_world' | 'match_found' | 'result_confirmed' | 'dispute';

type TestResult = {
  success?: boolean;
  error?: string;
  recipient?: {
    username: string;
    phone: string;
    profileFound: boolean;
    notificationsEnabled: boolean;
  };
  result?: {
    ok: boolean;
    status: number;
    error?: string;
    details?: string;
    messageId?: string | null;
    normalizedTo?: string;
    templateName?: string;
  };
};

const QUICK_RECIPIENTS = [
  { label: 'ryanair001', username: 'ryanair001', phone: '+254708355692' },
  { label: 'samawesome', username: 'samawesome', phone: '+254113033475' },
];

const MODE_META: Record<TestMode, { label: string; helper: string }> = {
  hello_world: {
    label: 'Hello World',
    helper: 'Meta sandbox template test',
  },
  match_found: {
    label: 'Match Found',
    helper: 'Preview the live queue notification copy',
  },
  result_confirmed: {
    label: 'Result Confirmed',
    helper: 'Preview the result locked-in notification',
  },
  dispute: {
    label: 'Dispute',
    helper: 'Preview the dispute escalation message',
  },
};

export default function WhatsAppOpsClient() {
  const authFetch = useAuthFetch();
  const [mode, setMode] = useState<TestMode>('hello_world');
  const [username, setUsername] = useState('ryanair001');
  const [phone, setPhone] = useState('+254708355692');
  const [opponentUsername, setOpponentUsername] = useState('samawesome');
  const [game, setGame] = useState('eFootball 2026');
  const [rankLabel, setRankLabel] = useState('Silver II');
  const [level, setLevel] = useState('3');
  const [matchId, setMatchId] = useState('preview-match');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const sendPreview = async () => {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await authFetch('/api/admin/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          username,
          phone,
          opponentUsername,
          game,
          rankLabel,
          level: Number(level),
          matchId,
          won: true,
        }),
      });

      const data = (await response.json()) as TestResult;
      setResult(data);

      if (!response.ok || !data.success) {
        toast.error(data.result?.details ?? data.result?.error ?? data.error ?? 'WhatsApp test failed');
        return;
      }

      toast.success('WhatsApp test accepted');
    } catch {
      toast.error('Could not send WhatsApp preview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-kicker">WhatsApp Ops</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Test 1:1 alerts and prep the lobby group lane.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Use this page to fire sandbox tests, preview live notification copy, and confirm who is
              wired before you move to the real WhatsApp business number.
            </p>
          </div>

          {WHATSAPP_GROUP_URL ? (
            <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer" className="btn-ghost">
              <MessageCircle size={14} />
              Open Lobby Group
            </a>
          ) : (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Add <code>NEXT_PUBLIC_WHATSAPP_GROUP_URL</code> when your lobby group invite is ready.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[var(--brand-teal)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Quick recipients</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_RECIPIENTS.map((recipient) => (
              <button
                key={recipient.label}
                type="button"
                onClick={() => {
                  setUsername(recipient.username);
                  setPhone(recipient.phone);
                }}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left transition-colors hover:bg-[var(--surface)]"
              >
                <p className="text-sm font-black text-[var(--text-primary)]">{recipient.label}</p>
                <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{recipient.phone}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Test mode</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(MODE_META) as TestMode[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      mode === key
                        ? 'border-[rgba(50,224,196,0.3)] bg-[rgba(50,224,196,0.14)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{MODE_META[key].label}</p>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{MODE_META[key].helper}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="input"
                  placeholder="ryanair001"
                />
              </div>
              <div>
                <label className="label">Manual phone override</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="input"
                  placeholder="+2547..."
                />
              </div>
              <div>
                <label className="label">Opponent username</label>
                <input
                  value={opponentUsername}
                  onChange={(event) => setOpponentUsername(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Game label</label>
                <input
                  value={game}
                  onChange={(event) => setGame(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Rank label</label>
                <input
                  value={rankLabel}
                  onChange={(event) => setRankLabel(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Level</label>
                <input
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="input"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className="label">Match ID / preview token</label>
              <input
                value={matchId}
                onChange={(event) => setMatchId(event.target.value)}
                className="input"
              />
            </div>

            <button type="button" onClick={sendPreview} disabled={submitting} className="btn-primary">
              <Send size={14} />
              {submitting ? 'Sending...' : `Send ${MODE_META[mode].label}`}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-[var(--brand-coral)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Last result</p>
          </div>

          {!result ? (
            <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              Fire a preview to inspect delivery status, sandbox restrictions, and which phone number
              actually got used.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div
                className={`rounded-2xl border p-4 ${
                  result.success
                    ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.12)]'
                    : 'border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.1)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 size={16} className="text-[var(--brand-teal)]" />
                  ) : (
                    <AlertCircle size={16} className="text-[var(--brand-coral)]" />
                  )}
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {result.success ? 'Accepted by Meta' : 'Send failed'}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                  {result.result?.details ?? result.result?.error ?? result.error ?? 'No extra details returned.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="label">Recipient</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {result.recipient?.username ?? 'Unknown'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {result.recipient?.phone ?? 'No phone found'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="brand-chip px-2.5 py-1">
                    {result.recipient?.profileFound ? 'Profile found' : 'Manual number'}
                  </span>
                  <span className="brand-chip-coral px-2.5 py-1">
                    {result.recipient?.notificationsEnabled ? 'Alerts on' : 'Alerts off or missing'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="label">Delivery details</p>
                <div className="mt-2 space-y-2 text-xs leading-6 text-[var(--text-secondary)]">
                  <p>Status: {result.result?.status ?? 0}</p>
                  <p>Normalized to: {result.result?.normalizedTo ?? 'n/a'}</p>
                  <p>Template: {result.result?.templateName ?? 'Custom text'}</p>
                  <p>Message ID: {result.result?.messageId ?? 'n/a'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
