"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CommunityGrowthChart } from "@/components/marketing/charts";
import { Card, PageHeader, ProgressBar } from "@/components/marketing/ui";
import { requestJson } from "@/lib/api-client";
import type { CommunityPageData } from "@/lib/types";

const LINES = [
  { key: "whatsapp_efootball", label: "WhatsApp eFootball", color: "#9b87f5" },
  { key: "whatsapp_codm", label: "WhatsApp CODM", color: "#f59e0b" },
  { key: "whatsapp_pubgm", label: "WhatsApp PUBGM", color: "#60a5fa" },
  { key: "followers_tiktok", label: "TikTok followers", color: "#32E0C4" },
  { key: "followers_instagram", label: "Instagram followers", color: "#FF6B6B" },
  { key: "followers_twitter", label: "Twitter followers", color: "#5FB5FF" },
  { key: "mechi_registered", label: "Mechi registered", color: "#F6B73C" },
] as const;

function buildSnapshotForm(data: CommunityPageData, weekId: string) {
  const existing = data.snapshots.find((snapshot) => snapshot.week_id === weekId);
  const week = data.weeks.find((item) => item.id === weekId);

  return {
    snapshot_date: existing?.snapshot_date ?? week?.week_end ?? "",
    whatsapp_efootball: existing?.whatsapp_efootball ?? 0,
    whatsapp_codm: existing?.whatsapp_codm ?? 0,
    whatsapp_pubgm: existing?.whatsapp_pubgm ?? 0,
    followers_tiktok: existing?.followers_tiktok ?? 0,
    followers_instagram: existing?.followers_instagram ?? 0,
    followers_twitter: existing?.followers_twitter ?? 0,
    mechi_registered: existing?.mechi_registered ?? 70,
    notes: existing?.notes ?? "",
  };
}

export function CommunityClient({
  initialData,
  focus,
}: {
  initialData: CommunityPageData;
  focus?: string | null;
}) {
  const router = useRouter();
  const [visibleKeys, setVisibleKeys] = useState(LINES.map((line) => line.key));
  const [selectedWeekId, setSelectedWeekId] = useState(initialData.weeks[0]?.id ?? "");
  const [form, setForm] = useState(buildSnapshotForm(initialData, initialData.weeks[0]?.id ?? ""));
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const chartData = data.weeks.map((week) => {
    const snapshot = data.snapshots.find((entry) => entry.week_id === week.id);
    return {
      label: `Week ${week.week_number}`,
      whatsapp_efootball: snapshot?.whatsapp_efootball ?? null,
      whatsapp_codm: snapshot?.whatsapp_codm ?? null,
      whatsapp_pubgm: snapshot?.whatsapp_pubgm ?? null,
      followers_tiktok: snapshot?.followers_tiktok ?? null,
      followers_instagram: snapshot?.followers_instagram ?? null,
      followers_twitter: snapshot?.followers_twitter ?? null,
      mechi_registered: snapshot?.mechi_registered ?? null,
    };
  });

  const latestSnapshot = data.snapshots.at(-1) ?? null;
  const firstSnapshot = data.snapshots[0] ?? null;
  const whatsappTotal =
    (latestSnapshot?.whatsapp_efootball ?? 0) +
    (latestSnapshot?.whatsapp_codm ?? 0) +
    (latestSnapshot?.whatsapp_pubgm ?? 0);
  const goals = [
    {
      label: "Mechi registered",
      current: latestSnapshot?.mechi_registered ?? 70,
      start: 70,
      target: 300,
    },
    {
      label: "TikTok followers",
      current: latestSnapshot?.followers_tiktok ?? 0,
      start: firstSnapshot?.followers_tiktok ?? 0,
      target: (firstSnapshot?.followers_tiktok ?? 0) + 500,
    },
    {
      label: "Instagram followers",
      current: latestSnapshot?.followers_instagram ?? 0,
      start: firstSnapshot?.followers_instagram ?? 0,
      target: (firstSnapshot?.followers_instagram ?? 0) + 300,
    },
    {
      label: "WhatsApp total",
      current: whatsappTotal,
      start: 0,
      target: 300,
    },
  ];

  const deltaRows = useMemo(
    () =>
      data.weeks.map((week, index) => {
        const current = data.snapshots.find((snapshot) => snapshot.week_id === week.id);
        const previousWeek = data.weeks[index - 1];
        const previous = previousWeek
          ? data.snapshots.find((snapshot) => snapshot.week_id === previousWeek.id)
          : null;

        return {
          week,
          current,
          previous,
        };
      }),
    [data.snapshots, data.weeks],
  );

  const saveSnapshot = async () => {
    try {
      await requestJson("/api/community", {
        method: "PUT",
        json: {
          week_id: selectedWeekId,
          ...form,
        },
      });
      setNotice("Community snapshot saved.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save snapshot");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community growth"
        title="Audience momentum"
        description="Track social followers, WhatsApp community growth, and registered Mechi users week over week."
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap gap-2">
          {LINES.map((line) => {
            const active = visibleKeys.includes(line.key);
            return (
              <button
                key={line.key}
                type="button"
                onClick={() =>
                  setVisibleKeys((current) =>
                    current.includes(line.key)
                      ? current.filter((key) => key !== line.key)
                      : [...current, line.key],
                  )
                }
                className={
                  active
                    ? "btn-secondary min-h-9 px-3 py-2 text-xs"
                    : "btn-ghost min-h-9 px-3 py-2 text-xs"
                }
              >
                {line.label}
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <CommunityGrowthChart
            data={chartData}
            activeKeys={LINES.filter((line) => visibleKeys.includes(line.key))}
          />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={focus === "snapshot-form" ? "ring-2 ring-[rgba(50,224,196,0.24)]" : ""}>
          <p className="eyebrow">Snapshot entry</p>
          <div className="mt-4 space-y-3">
            <select
              className="field-base"
              value={selectedWeekId}
              onChange={(event) => {
                const weekId = event.target.value;
                setSelectedWeekId(weekId);
                setForm(buildSnapshotForm(data, weekId));
              }}
            >
              {data.weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.week_number}
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["whatsapp_efootball", "WhatsApp eFootball"],
                ["whatsapp_codm", "WhatsApp CODM"],
                ["whatsapp_pubgm", "WhatsApp PUBGM"],
                ["followers_tiktok", "TikTok followers"],
                ["followers_instagram", "Instagram followers"],
                ["followers_twitter", "Twitter followers"],
                ["mechi_registered", "Mechi registered"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="input-label">{label}</label>
                  <input
                    className="field-base"
                    type="number"
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="input-label">Snapshot date</label>
              <input
                className="field-base"
                type="date"
                value={form.snapshot_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, snapshot_date: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="input-label">Notes</label>
              <textarea
                className="field-base min-h-28"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
            <button type="button" className="btn-primary" onClick={saveSnapshot} disabled={isPending}>
              Save snapshot
            </button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="eyebrow">Goals</p>
            <div className="mt-4 space-y-4">
              {goals.map((goal) => {
                const span = Math.max(goal.target - goal.start, 1);
                const progress = Math.round(((goal.current - goal.start) / span) * 100);

                return (
                  <div key={goal.label} className="panel-muted p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{goal.label}</p>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {goal.current} / {goal.target}
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={progress} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <p className="eyebrow">Week-on-week delta</p>
            <div className="mt-4 table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-[var(--text-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Week</th>
                    <th className="px-4 py-3 font-semibold">Mechi</th>
                    <th className="px-4 py-3 font-semibold">TikTok</th>
                    <th className="px-4 py-3 font-semibold">Instagram</th>
                    <th className="px-4 py-3 font-semibold">Twitter</th>
                    <th className="px-4 py-3 font-semibold">WhatsApp total</th>
                  </tr>
                </thead>
                <tbody>
                  {deltaRows.map((row) => {
                    const currentWhatsapp =
                      (row.current?.whatsapp_efootball ?? 0) +
                      (row.current?.whatsapp_codm ?? 0) +
                      (row.current?.whatsapp_pubgm ?? 0);
                    const previousWhatsapp =
                      (row.previous?.whatsapp_efootball ?? 0) +
                      (row.previous?.whatsapp_codm ?? 0) +
                      (row.previous?.whatsapp_pubgm ?? 0);
                    const deltas = [
                      (row.current?.mechi_registered ?? 0) - (row.previous?.mechi_registered ?? 0),
                      (row.current?.followers_tiktok ?? 0) - (row.previous?.followers_tiktok ?? 0),
                      (row.current?.followers_instagram ?? 0) - (row.previous?.followers_instagram ?? 0),
                      (row.current?.followers_twitter ?? 0) - (row.previous?.followers_twitter ?? 0),
                      currentWhatsapp - previousWhatsapp,
                    ];

                    return (
                      <tr key={row.week.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 text-white">Week {row.week.week_number}</td>
                        {deltas.map((delta, index) => (
                          <td
                            key={`${row.week.id}-${index}`}
                            className={`px-4 py-3 font-semibold ${delta >= 0 ? "text-[var(--success)]" : "text-[var(--coral)]"}`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
