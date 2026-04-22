"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WeeklySpendChart } from "@/components/marketing/charts";
import { Card, PageHeader, ProgressBar } from "@/components/marketing/ui";
import { requestJson } from "@/lib/api-client";
import { formatKes, formatLongDate } from "@/lib/format";
import type { AdsPageData } from "@/lib/types";

const PLATFORM_META = {
  meta: { label: "Meta", color: "#32E0C4" },
  tiktok: { label: "TikTok", color: "#FF6B6B" },
  twitter: { label: "Twitter/X", color: "#5FB5FF" },
} as const;

function buildEntryForm(week?: AdsPageData["weeks"][number]) {
  return {
    platform: "meta",
    amount_kes: 0,
    description: "",
    date: week?.week_start ?? "",
    week_id: week?.id ?? "",
  };
}

export function AdsClient({
  initialData,
  focus,
}: {
  initialData: AdsPageData;
  focus?: string | null;
}) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState(buildEntryForm(initialData.weeks[0]));
  const [settingsForm, setSettingsForm] = useState(initialData.settings);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;
  const activeSettings = data.settings;

  const totalSpent = data.entries.reduce((total, entry) => total + entry.amount_kes, 0);
  const remainingBudget = activeSettings.total_budget_kes - totalSpent;
  const totalProgress =
    activeSettings.total_budget_kes === 0
      ? 0
      : Math.round((totalSpent / activeSettings.total_budget_kes) * 100);

  const weeklyRows = data.weeks.map((week) => {
    const entries = data.entries.filter((entry) => entry.week_id === week.id);
    const meta = entries
      .filter((entry) => entry.platform === "meta")
      .reduce((total, entry) => total + entry.amount_kes, 0);
    const tiktok = entries
      .filter((entry) => entry.platform === "tiktok")
      .reduce((total, entry) => total + entry.amount_kes, 0);
    const twitter = entries
      .filter((entry) => entry.platform === "twitter")
      .reduce((total, entry) => total + entry.amount_kes, 0);

    return {
      week,
      meta,
      tiktok,
      twitter,
      total: meta + tiktok + twitter,
    };
  });

  const submitEntry = async () => {
    try {
      await requestJson("/api/ads", {
        method: "POST",
        json: form,
      });
      setNotice("Ad spend entry added.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to add ad spend entry");
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await requestJson(`/api/ads?id=${id}`, { method: "DELETE" });
      setNotice("Ad spend entry deleted.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to delete ad spend entry");
    }
  };

  const saveSettings = async () => {
    try {
      await requestJson("/api/settings", {
        method: "PATCH",
        json: settingsForm,
      });
      setShowSettings(false);
      setNotice("Budget settings saved.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save settings");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ad spend tracker"
        title="Campaign budget control"
        description="Track platform spend, compare against monthly and weekly targets, and keep the log clean for end-of-campaign reporting."
        actions={
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSettingsForm(activeSettings);
              setShowSettings(true);
            }}
          >
            Edit budgets
          </button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Budget summary</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {formatKes(activeSettings.total_budget_kes)}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Total spent {formatKes(totalSpent)} - Remaining {formatKes(remainingBudget)}
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
            {totalProgress}% used
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar
            value={totalProgress}
            tone={totalProgress > 100 ? "danger" : totalProgress >= 80 ? "warning" : "accent"}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {(["meta", "tiktok", "twitter"] as const).map((platform) => {
          const budgetKey = `${platform}_budget_kes` as const;
          const budget = activeSettings[budgetKey];
          const spent = data.entries
            .filter((entry) => entry.platform === platform)
            .reduce((total, entry) => total + entry.amount_kes, 0);
          const percent = budget === 0 ? 0 : Math.round((spent / budget) * 100);

          return (
            <Card key={platform}>
              <p className="eyebrow">{PLATFORM_META[platform].label}</p>
              <p className="mt-2 text-2xl font-black text-white">{formatKes(budget)}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Spent this month {formatKes(spent)}
              </p>
              <div className="mt-4">
                <ProgressBar
                  value={percent}
                  tone={percent > 100 ? "danger" : percent >= 80 ? "warning" : "accent"}
                />
              </div>
              <WeeklySpendChart
                data={weeklyRows.map((row) => ({
                  label: `W${row.week.week_number}`,
                  value: row[platform],
                }))}
                dataKey="value"
                color={PLATFORM_META[platform].color}
              />
            </Card>
          );
        })}
      </div>

      <Card className={focus === "add-entry" ? "ring-2 ring-[rgba(50,224,196,0.24)]" : ""}>
        <p className="eyebrow">Weekly spend table</p>
        <div className="mt-4 table-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[var(--text-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Meta</th>
                <th className="px-4 py-3 font-semibold">TikTok</th>
                <th className="px-4 py-3 font-semibold">Twitter</th>
                <th className="px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {weeklyRows.map((row) => (
                <tr key={row.week.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-white">Week {row.week.week_number}</td>
                  <td className="px-4 py-3 text-white">{formatKes(row.meta)}</td>
                  <td className="px-4 py-3 text-white">{formatKes(row.tiktok)}</td>
                  <td className="px-4 py-3 text-white">{formatKes(row.twitter)}</td>
                  <td className="px-4 py-3 text-white">{formatKes(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="panel-muted p-4">
            <p className="eyebrow">Add entry</p>
            <div className="mt-4 space-y-3">
              <select
                className="field-base"
                value={form.week_id}
                onChange={(event) => {
                  const week = data.weeks.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    week_id: event.target.value,
                    date: week?.week_start ?? current.date,
                  }));
                }}
              >
                {data.weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Week {week.week_number}
                  </option>
                ))}
              </select>
              <select
                className="field-base"
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({ ...current, platform: event.target.value }))
                }
              >
                <option value="meta">Meta</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter</option>
              </select>
              <input
                className="field-base"
                type="number"
                placeholder="Amount in KES"
                value={form.amount_kes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount_kes: Number(event.target.value) }))
                }
              />
              <input
                className="field-base"
                placeholder="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <input
                className="field-base"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
              <button type="button" className="btn-primary w-full" onClick={submitEntry}>
                Add spend entry
              </button>
            </div>
          </div>

          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-[var(--text-soft)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Platform</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {formatLongDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-white">{PLATFORM_META[entry.platform].label}</td>
                    <td className="px-4 py-3 text-white">{formatKes(entry.amount_kes)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {entry.description ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn-danger min-h-9 px-3 py-2 text-xs"
                        onClick={() => deleteEntry(entry.id)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card-surface w-full max-w-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Budget settings</p>
                <h3 className="mt-2 text-2xl font-black text-white">Edit monthly budgets</h3>
              </div>
              <button
                type="button"
                className="btn-ghost min-h-9 px-3 py-2 text-xs"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {([
                ["total_budget_kes", "Total budget"],
                ["meta_budget_kes", "Meta budget"],
                ["tiktok_budget_kes", "TikTok budget"],
                ["twitter_budget_kes", "Twitter budget"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="input-label">{label}</label>
                  <input
                    className="field-base"
                    type="number"
                    value={settingsForm[key]}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" className="btn-primary" onClick={saveSettings}>
                Save budgets
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
