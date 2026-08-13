"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Save, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthFetch } from "@/components/AuthProvider";
import type { PassportOwnerData } from "@/lib/passport-types";

type Settings = {
  enabled: boolean;
  headline: string;
  creator_roles: string[];
  inquiry_url: string | null;
  include_dimensions: boolean;
  include_events: boolean;
  include_teams: boolean;
};
const EMPTY: Settings = {
  enabled: false,
  headline: "",
  creator_roles: [],
  inquiry_url: null,
  include_dimensions: true,
  include_events: true,
  include_teams: true,
};
export function PassportMediaKitManager() {
  const authFetch = useAuthFetch();
  const [settings, setSettings] = useState(EMPTY);
  const [roles, setRoles] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicHandle, setPublicHandle] = useState("");
  const load = useCallback(async () => {
    const [response, passportResponse] = await Promise.all([
      authFetch("/api/passport/media-kit"),
      authFetch("/api/passport/me"),
    ]);
    const payload = await response.json();
    const passportPayload = (await passportResponse.json()) as {
      passport?: PassportOwnerData;
    };
    if (!response.ok)
      return toast.error(payload.error ?? "Could not load media kit");
    setSettings(payload.settings);
    setRoles((payload.settings.creator_roles ?? []).join(", "));
    const identity = passportPayload.passport?.identity;
    setPublicHandle(
      identity?.publication_status === "published"
        ? (identity.public_handle ?? "")
        : "",
    );
  }, [authFetch]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await authFetch("/api/passport/media-kit", {
      method: "PATCH",
      body: JSON.stringify({
        ...settings,
        creator_roles: roles
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean),
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok)
      return toast.error(payload.error ?? "Could not save media kit");
    toast.success("Media kit settings saved");
    await load();
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-7">
      <header className="card p-6 sm:p-8">
        <p className="brand-kicker">Creator and organizer tools</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
          Sponsor-safe Gamer Media Kit
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Turn selected Passport facts into a clean one-page introduction. No
          private contacts, game IDs, or hidden activity are exposed; your
          inquiry link must use HTTPS.
        </p>
      </header>
      <form onSubmit={save} className="card space-y-5 p-6">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] p-4">
          <span>
            <span className="block font-black text-[var(--text-primary)]">
              Publish media kit
            </span>
            <span className="mt-1 block text-xs text-[var(--text-soft)]">
              Available on Pro and Elite while the plan is active.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
        </label>
        <label className="block">
          <span className="label">Positioning headline</span>
          <input
            className="input-field mt-2"
            maxLength={140}
            placeholder="Competitive player, community host, and East African gaming creator"
            value={settings.headline}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                headline: event.target.value,
              }))
            }
          />
        </label>
        <label className="block">
          <span className="label">Creator / organizer roles</span>
          <input
            className="input-field mt-2"
            placeholder="Streamer, Tournament host, Commentator"
            value={roles}
            onChange={(event) => setRoles(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Public inquiry URL</span>
          <input
            className="input-field mt-2"
            type="url"
            placeholder="https://your-contact-or-booking-page.example"
            value={settings.inquiry_url ?? ""}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                inquiry_url: event.target.value || null,
              }))
            }
          />
        </label>
        <fieldset>
          <legend className="label">Sections to include</legend>
          <div className="mt-3 flex flex-wrap gap-5">
            {(
              [
                { key: "include_dimensions", label: "Gamer Dimensions" },
                { key: "include_events", label: "Verified event count" },
                { key: "include_teams", label: "Team profile" },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]"
              >
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      [item.key]: event.target.checked,
                    }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save media kit"}
          </button>
          {publicHandle && settings.enabled ? (
            <a
              href={`/media-kit/@${publicHandle}`}
              className="btn-outline inline-flex items-center gap-2"
            >
              <BriefcaseBusiness size={16} />
              Preview public kit
            </a>
          ) : null}
        </div>
        <p className="flex items-start gap-2 text-xs leading-5 text-[var(--text-soft)]">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-[var(--brand-teal)]"
            size={14}
          />
          Media-kit styling is a presentation feature, never a verification
          badge or endorsement by Mechi or an event organizer.
        </p>
      </form>
    </main>
  );
}
