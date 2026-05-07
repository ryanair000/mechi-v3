"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/marketing/ui";
import { requestJson } from "@/lib/api-client";
import { formatDayTypeLabel, formatLongDate } from "@/lib/format";
import type { ContentItem, ContentPageData } from "@/lib/types";
import { addDays, cn } from "@/lib/utils";

const CHANNELS = [
  ["posted_tiktok", "TikTok"],
  ["posted_instagram", "Instagram"],
  ["posted_twitter", "X"],
  ["posted_whatsapp", "WhatsApp"],
] as const;

export function ContentClient({
  initialData,
  initialView,
}: {
  initialData: ContentPageData;
  initialView?: string;
  focus?: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState(initialView === "list" ? "list" : "calendar");
  const [draft, setDraft] = useState<ContentItem | null>(initialData.items[0] ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    data.items.forEach((item) => {
      const existing = map.get(item.scheduled_date) ?? [];
      existing.push(item);
      map.set(item.scheduled_date, existing);
    });
    return map;
  }, [data.items]);

  const progress = CHANNELS.map(([field, label]) => {
    const posted = data.items.filter((item) => item[field]).length;
    const total = data.items.length;

    return {
      field,
      label,
      posted,
      total,
      percentage: total === 0 ? 0 : Math.round((posted / total) * 100),
    };
  });

  const overallRate = (() => {
    const totalSlots = data.items.length * CHANNELS.length;
    const postedSlots = data.items.reduce(
      (total, item) =>
        total + CHANNELS.reduce((inner, [field]) => inner + (item[field] ? 1 : 0), 0),
      0,
    );

    return totalSlots === 0 ? 0 : Math.round((postedSlots / totalSlots) * 100);
  })();

  const saveItem = async (nextDraft: ContentItem) => {
    try {
      await requestJson(`/api/content/${nextDraft.id}`, {
        method: "PATCH",
        json: nextDraft,
      });
      setNotice("Content item updated.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save content item");
    }
  };

  const weekCells = data.weeks.map((week) =>
    Array.from({ length: 7 }, (_, index) => ({
      date: addDays(week.week_start, index),
      label: new Date(`${addDays(week.week_start, index)}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      items: itemsByDate.get(addDays(week.week_start, index)) ?? [],
      week,
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content calendar"
        title="Weekly content plan"
        description="See the four-week calendar, channel completion, and edit content items from a single drawer."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className={view === "calendar" ? "btn-secondary" : "btn-ghost"}
              onClick={() => setView("calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              className={view === "list" ? "btn-secondary" : "btn-ghost"}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <Card>
        <div className="grid gap-4 lg:grid-cols-4">
          {progress.map((channel) => (
            <div key={channel.field} className="panel-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">{channel.label}</p>
                <span className="text-sm font-bold text-white">
                  {channel.posted}/{channel.total}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {channel.percentage}% posted
              </p>
              <div className="mt-3">
                <ProgressBar value={channel.percentage} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Overall posting rate: <span className="font-bold text-white">{overallRate}%</span>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          {view === "calendar" ? (
            <div className="grid gap-4 xl:grid-cols-4">
              {weekCells.map((days, index) => (
                <div key={data.weeks[index]?.id ?? index} className="space-y-3">
                  <div>
                    <p className="eyebrow">Week {data.weeks[index]?.week_number}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {data.weeks[index]?.tournament_game}
                    </p>
                  </div>

                  {days.map((day) => (
                    <div key={day.date} className="panel-muted min-h-36 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white">{day.label}</p>
                        <span className="text-xs text-[var(--text-soft)]">{day.date.slice(5)}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {day.items.length === 0 ? (
                          <p className="text-xs text-[var(--text-soft)]">No content</p>
                        ) : (
                          day.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDraft(item)}
                              className="w-full rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-left"
                            >
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {CHANNELS.map(([field, label]) => (
                                  <span
                                    key={field}
                                    className={cn(
                                      "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                                      item[field]
                                        ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent)]"
                                        : "border-[var(--border)] bg-white/[0.02] text-[var(--text-soft)]",
                                    )}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-[var(--text-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Channels</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-t border-[var(--border)] hover:bg-white/[0.03]"
                      onClick={() => setDraft(item)}
                    >
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {formatLongDate(item.scheduled_date)}
                      </td>
                      <td className="px-4 py-3 text-white">{item.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.day_type === "custom" ? "draft" : "completed"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {CHANNELS.map(([field, label]) => (
                            <span
                              key={field}
                              className={cn(
                                "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                                item[field]
                                  ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent)]"
                                  : "border-[var(--border)] bg-white/[0.02] text-[var(--text-soft)]",
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {draft ? (
          <Card>
            <p className="eyebrow">Edit drawer</p>
            <h3 className="mt-2 text-2xl font-black text-white">{draft.title}</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {formatLongDate(draft.scheduled_date)} - {formatDayTypeLabel(draft.day_type)}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="input-label">Title</label>
                <input
                  className="field-base"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div>
                <label className="input-label">Description</label>
                <textarea
                  className="field-base min-h-24"
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div>
                <label className="input-label">Notes</label>
                <textarea
                  className="field-base min-h-28"
                  value={draft.notes ?? ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, notes: event.target.value } : current,
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {CHANNELS.map(([field, label]) => (
                <button
                  key={field}
                  type="button"
                  onClick={() =>
                    setDraft((current) =>
                      current ? { ...current, [field]: !current[field] } : current,
                    )
                  }
                  className={
                    draft[field]
                      ? "btn-secondary min-h-9 px-3 py-2 text-xs"
                      : "btn-ghost min-h-9 px-3 py-2 text-xs"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          posted_tiktok: true,
                          posted_instagram: true,
                          posted_twitter: true,
                          posted_whatsapp: true,
                        }
                      : current,
                  )
                }
              >
                Mark all posted
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => draft && saveItem(draft)}
                disabled={isPending}
              >
                Save item
              </button>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Pick a content item"
            description="Select any scheduled item from the calendar or list view to edit it here."
          />
        )}
      </div>
    </div>
  );
}
