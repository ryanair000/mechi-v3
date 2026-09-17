"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarRange,
  Download,
  ExternalLink,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthFetch } from "@/components/AuthProvider";
import type { PassportReplay } from "@/lib/passport-progression-types";

export function PassportReplayStudio() {
  const authFetch = useAuthFetch();
  const now = new Date().getFullYear();
  const [year, setYear] = useState(now);
  const [replays, setReplays] = useState<PassportReplay[]>([]);
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    const response = await authFetch("/api/passport/replay");
    const payload = await response.json();
    if (response.ok) setReplays(payload.replays ?? []);
    else toast.error(payload.error ?? "Could not load Replays");
  }, [authFetch]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function generate() {
    setWorking(true);
    const response = await authFetch("/api/passport/replay", {
      method: "POST",
      body: JSON.stringify({ year }),
    });
    const payload = await response.json();
    setWorking(false);
    if (!response.ok)
      return toast.error(payload.error ?? "Could not generate Replay");
    toast.success(`${year} Replay generated from your Passport sources`);
    await load();
  }
  function trackShare(
    replay: PassportReplay,
    channel: "public_link" | "download",
  ) {
    void authFetch("/api/passport/analytics", {
      method: "POST",
      body: JSON.stringify({
        event: "passport_replay_shared",
        properties: { channel, replay_year: replay.replay_year },
      }),
    });
  }
  async function toggle(replay: PassportReplay) {
    const willBePublic = !replay.is_public;
    const response = await authFetch("/api/passport/replay", {
      method: "PATCH",
      body: JSON.stringify({ id: replay.id, is_public: willBePublic }),
    });
    if (!response.ok) return toast.error("Could not change Replay sharing");
    if (willBePublic) trackShare(replay, "public_link");
    await load();
  }
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-7">
      <header className="card p-6 sm:p-8">
        <p className="brand-kicker">Annual Gamer Replay</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
          Your gaming year, with receipts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Replay reconciles your library, completed Mechi matches, active event
          credentials, and achievements. Exact values are separated from
          estimates; owner-recorded hours are labeled as recorded, never
          inferred.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            className="input-field max-w-40"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from({ length: now - 2019 }, (_, index) => now - index).map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <button
            className="btn-primary inline-flex items-center gap-2"
            disabled={working}
            onClick={() => void generate()}
          >
            <RefreshCw size={16} />
            {working ? "Reconciling…" : "Generate Replay"}
          </button>
        </div>
      </header>
      <section className="grid gap-5 lg:grid-cols-2">
        {replays.map((replay) => (
          <article key={replay.id} className="card overflow-hidden">
            <div className="relative aspect-[1200/630] bg-[#071018]">
              <Image
                src={`/api/passport/replay-cards/${replay.share_token}`}
                alt={`${replay.replay_year} Gamer Replay card`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="brand-kicker">
                    {replay.period_state.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {replay.replay_year} Replay
                  </h2>
                </div>
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-[var(--text-soft)]">
                  {replay.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric
                  value={replay.payload.exact.games_added}
                  label="Games added"
                />
                <Metric
                  value={replay.payload.exact.verified_matches}
                  label="Matches"
                />
                <Metric
                  value={replay.payload.exact.distinct_events}
                  label="Events"
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--text-soft)]">
                <ShieldCheck className="mr-1 inline" size={13} />
                Source cutoff:{" "}
                {new Date(replay.source_cutoff_at).toLocaleString()}.{" "}
                {replay.payload.estimates.length
                  ? `${replay.payload.estimates.length} values are explicitly estimated.`
                  : "No estimated values in this Replay."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-outline inline-flex items-center gap-2"
                  onClick={() => void toggle(replay)}
                >
                  <Share2 size={15} />
                  {replay.is_public ? "Make private" : "Enable public link"}
                </button>
                {replay.is_public ? (
                  <>
                    <Link
                      href={`/replay/${replay.share_token}`}
                      className="btn-ghost inline-flex items-center gap-2"
                    >
                      <ExternalLink size={15} />
                      View
                    </Link>
                    <a
                      download
                      href={`/api/passport/replay-cards/${replay.share_token}?download=1`}
                      className="btn-ghost inline-flex items-center gap-2"
                      onClick={() => trackShare(replay, "download")}
                    >
                      <Download size={15} />
                      PNG
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!replays.length ? (
          <div className="card grid min-h-72 place-items-center p-8 text-center text-sm text-[var(--text-soft)]">
            <div>
              <CalendarRange className="mx-auto mb-3 h-8 w-8" />
              <p>
                Choose a year to create your first reproducible Gamer Replay.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-black/10 p-3">
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-soft)]">
        {label}
      </p>
    </div>
  );
}
