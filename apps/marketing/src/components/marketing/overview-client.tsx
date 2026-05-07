"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  EmptyState,
  GameChip,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusBadge,
} from "@/components/marketing/ui";
import { requestJson } from "@/lib/api-client";
import { formatCountdownLabel, formatKes, formatLongDate } from "@/lib/format";
import type { ContentItem, OverviewData, PayoutRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function channelLabels() {
  return [
    ["posted_tiktok", "TikTok"],
    ["posted_instagram", "Instagram"],
    ["posted_twitter", "X"],
    ["posted_whatsapp", "WhatsApp"],
  ] as const;
}

export function OverviewClient({ initialData }: { initialData: OverviewData }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const runAndRefresh = async (work: () => Promise<void>, successMessage: string) => {
    try {
      await work();
      setNotice(successMessage);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleSeed = () =>
    runAndRefresh(() => requestJson("/api/seed", { method: "POST" }), "Seed completed.");

  const markPaid = (row: PayoutRow) =>
    runAndRefresh(async () => {
      if (row.source_type === "tournament") {
        await requestJson(`/api/tournaments/${row.source_id}`, {
          method: "PATCH",
          json: { payment_target: row.placement, paid: true },
        });
        return;
      }

      await requestJson(`/api/bounties/${row.source_id}`, {
        method: "PATCH",
        json: { paid: true },
      });
    }, "Payout updated.");

  const toggleChannel = (item: ContentItem, field: keyof ContentItem) =>
    runAndRefresh(
      () =>
        requestJson(`/api/content/${item.id}`, {
          method: "PATCH",
          json: { [field]: !item[field] },
        }),
      "Content item updated.",
    );

  const activeBountyPrize = data.currentWeekActiveBounties.reduce(
    (total, bounty) => total + bounty.prize_kes,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaign overview"
        title={`Week ${data.currentWeek?.week_number ?? 1} of 4`}
        description="Track paid and pending prizes, weekly campaign progress, and the current tournament workload from one surface."
        actions={
          <button type="button" onClick={handleSeed} className="btn-ghost" disabled={isPending}>
            <RefreshCw size={16} className={cn(isPending && "animate-spin")} />
            Run seed
          </button>
        }
      />

      {notice ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <AlertCircle size={16} className="text-[var(--accent)]" />
          {notice}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Campaign progress</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              {data.progress.dateRangeLabel}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {data.progress.daysElapsed} of {data.progress.totalDays} campaign days elapsed.
            </p>
          </div>
          <div className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] px-4 py-2 text-sm font-bold text-[var(--accent)]">
            {data.progress.daysRemaining} days remaining
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={data.progress.percentage} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total prize paid" value={formatKes(data.stats.totalPrizePaid)} />
        <StatCard label="Prize pending" value={formatKes(data.stats.totalPrizePending)} />
        <StatCard label="Ad spend" value={formatKes(data.stats.totalAdSpend)} />
        <StatCard label="Active bounties" value={String(data.stats.activeBounties)} />
      </div>

      {!data.seeded ? (
        <EmptyState
          title="The campaign dataset has not been initialized yet."
          description="Run the seed once to create the 4 campaign weeks, default tournaments, generated content items, and the Week 1 draft bounty stack."
          action={
            <button type="button" onClick={handleSeed} className="btn-primary" disabled={isPending}>
              Initialize campaign
            </button>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">This week</p>
            {data.currentWeek ? <GameChip game={data.currentWeek.tournament_game} /> : null}
            {data.currentTournament ? <StatusBadge status={data.currentTournament.status} /> : null}
          </div>

          {data.currentWeek ? (
            <>
              <h3 className="mt-3 text-2xl font-black text-white">
                Week {data.currentWeek.week_number} - {formatLongDate(data.currentWeek.week_start)}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {data.currentTournament
                  ? formatCountdownLabel(data.currentTournament.date)
                  : "Tournament not created yet"}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="panel-muted p-4">
                  <p className="eyebrow">Active bounties</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {data.currentWeekActiveBounties.length}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatKes(activeBountyPrize)} in live bounty value this week
                  </p>
                </div>
                <div className="panel-muted p-4">
                  <p className="eyebrow">Tournament date</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {data.currentTournament ? formatLongDate(data.currentTournament.date) : "-"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Friday tournament checkpoint
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Content due this week</p>
                  <Link href="/content" className="text-sm font-semibold text-[var(--accent)]">
                    Open calendar
                  </Link>
                </div>

                {data.currentWeekContent.length === 0 ? (
                  <EmptyState
                    title="No content items scheduled"
                    description="Generated weekly content appears here after the seed or week creation flow."
                  />
                ) : (
                  <div className="space-y-3">
                    {data.currentWeekContent.map((item) => (
                      <div key={item.id} className="panel-muted p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">{item.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                              {formatLongDate(item.scheduled_date)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {channelLabels().map(([field, label]) => (
                              <button
                                key={field}
                                type="button"
                                onClick={() => toggleChannel(item, field)}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]",
                                  item[field]
                                    ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent)]"
                                    : "border-[var(--border)] bg-white/[0.03] text-[var(--text-soft)]",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title="Seed the campaign to unlock the weekly overview"
              description="The hero week card becomes live once the 4 campaign weeks exist in the separate marketing Supabase project."
            />
          )}
        </Card>

        <Card>
          <p className="eyebrow">Quick actions</p>
          <div className="mt-4 grid gap-3">
            <Link
              href={data.currentWeek ? `/week/${data.currentWeek.id}?focus=tournament-live` : "#"}
              className="btn-secondary justify-between"
            >
              Mark Tournament Live
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Friday
              </span>
            </Link>
            <Link
              href={data.currentWeek ? `/week/${data.currentWeek.id}?focus=bounty-winner` : "#"}
              className="btn-ghost justify-between"
            >
              Add Bounty Winner
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Claim
              </span>
            </Link>
            <Link href="/ads?focus=add-entry" className="btn-ghost justify-between">
              Log Ad Spend
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                KES
              </span>
            </Link>
            <Link href="/community?focus=snapshot-form" className="btn-ghost justify-between">
              Add Community Snapshot
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Week
              </span>
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Prize payout summary</p>
            <h3 className="mt-2 text-2xl font-black text-white">Last 10 payout entries</h3>
          </div>
          <Link href="/bounties" className="text-sm font-semibold text-[var(--accent)]">
            Open full payouts
          </Link>
        </div>

        <div className="mt-5 table-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[var(--text-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Game</th>
                <th className="px-4 py-3 font-semibold">Winner</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.payoutRows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatLongDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-white">{row.type}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {row.game ? <GameChip game={row.game} /> : "-"}
                  </td>
                  <td className="px-4 py-3 text-white">{row.winner}</td>
                  <td className="px-4 py-3 text-white">{formatKes(row.amount_kes)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.paid ? "paid" : "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    {row.paid ? (
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        Settled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markPaid(row)}
                        className="btn-secondary min-h-9 px-3 py-2 text-xs"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
