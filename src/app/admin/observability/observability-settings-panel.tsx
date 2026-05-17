'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import type { ObservabilitySettings } from '@/lib/observability-settings';

type SettingsState = Pick<
  ObservabilitySettings,
  | 'posthog_capture_enabled'
  | 'sentry_capture_enabled'
  | 'sentry_replay_on_error_enabled'
  | 'payment_support_notice'
>;

export function ObservabilitySettingsPanel({ initialSettings }: { initialSettings: ObservabilitySettings }) {
  const [settings, setSettings] = useState<SettingsState>({
    posthog_capture_enabled: initialSettings.posthog_capture_enabled,
    sentry_capture_enabled: initialSettings.sentry_capture_enabled,
    sentry_replay_on_error_enabled: initialSettings.sentry_replay_on_error_enabled,
    payment_support_notice: initialSettings.payment_support_notice,
  });
  const [updatedAt, setUpdatedAt] = useState(initialSettings.updated_at);
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/observability/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as {
        settings?: ObservabilitySettings;
        error?: string;
      };

      if (!response.ok || !data.settings) {
        toast.error(data.error ?? 'Failed to save observability settings');
        return;
      }

      setSettings({
        posthog_capture_enabled: data.settings.posthog_capture_enabled,
        sentry_capture_enabled: data.settings.sentry_capture_enabled,
        sentry_replay_on_error_enabled: data.settings.sentry_replay_on_error_enabled,
        payment_support_notice: data.settings.payment_support_notice,
      });
      setUpdatedAt(data.settings.updated_at);
      toast.success('Observability settings saved');
    } catch {
      toast.error('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  }

  const toggles: Array<{
    key: keyof Omit<SettingsState, 'payment_support_notice'>;
    label: string;
    detail: string;
  }> = [
    {
      key: 'posthog_capture_enabled',
      label: 'PostHog capture',
      detail: 'Operational switch for analytics review and test events.',
    },
    {
      key: 'sentry_capture_enabled',
      label: 'Sentry capture',
      detail: 'Operational switch for error monitoring checks.',
    },
    {
      key: 'sentry_replay_on_error_enabled',
      label: 'Replay on error',
      detail: 'Controls whether admins intend replay-on-error to stay enabled.',
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="brand-kicker">Managed settings</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Analytics controls
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            These are database-backed admin controls for the observability desk. Secrets still live
            in Vercel environment variables.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={saving}
          className="btn-outline min-h-10 px-3 py-2 text-xs"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save settings
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {toggles.map((toggle) => (
          <label
            key={toggle.key}
            className="flex min-h-28 cursor-pointer flex-col justify-between rounded-md border border-[var(--border-color)] bg-[var(--surface-soft)] p-4"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-black text-[var(--text-primary)]">
                  {toggle.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                  {toggle.detail}
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings[toggle.key]}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    [toggle.key]: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-[var(--brand-teal)]"
              />
            </span>
          </label>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Payment support notice
        </span>
        <textarea
          value={settings.payment_support_notice}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              payment_support_notice: event.target.value,
            }))
          }
          rows={3}
          maxLength={260}
          className="mt-2 w-full rounded-md border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.45)]"
        />
      </label>

      {updatedAt ? (
        <p className="mt-3 text-xs text-[var(--text-soft)]">
          Last saved {new Date(updatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
