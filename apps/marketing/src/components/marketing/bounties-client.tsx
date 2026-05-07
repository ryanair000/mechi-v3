"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, GameChip, PageHeader, StatCard, StatusBadge } from "@/components/marketing/ui";
import { downloadCsv, requestJson } from "@/lib/api-client";
import { formatKes } from "@/lib/format";
import type { BountiesPageData, Bounty } from "@/lib/types";

const TABS = ["all", "active", "claimed", "draft", "cancelled"] as const;

export function BountiesClient({
  initialData,
  initialStatus,
  initialWeek,
}: {
  initialData: BountiesPageData;
  initialStatus?: string;
  initialWeek?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>(
    TABS.includes(initialStatus as (typeof TABS)[number])
      ? (initialStatus as (typeof TABS)[number])
      : "all",
  );
  const [weekFilter, setWeekFilter] = useState(initialWeek ?? "all");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const weekMap = Object.fromEntries(data.weeks.map((week) => [week.id, week]));
  const filtered = data.bounties.filter((bounty) => {
    if (tab !== "all" && bounty.status !== tab) return false;
    if (weekFilter !== "all" && bounty.week_id !== weekFilter) return false;
    return true;
  });

  const markPaid = async (bounty: Bounty) => {
    try {
      await requestJson(`/api/bounties/${bounty.id}`, {
        method: "PATCH",
        json: { paid: true },
      });
      setNotice("Bounty marked as paid.");
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update bounty");
    }
  };

  const exportRows = useMemo(
    () =>
      filtered.map((bounty) => ({
        Week: weekMap[bounty.week_id]?.week_number ?? "",
        Title: bounty.title,
        Game: bounty.game ?? "platform",
        Prize: bounty.prize_kes,
        Status: bounty.status,
        Winner: bounty.winner_name ?? "",
        Phone: bounty.winner_phone ?? "",
        Paid: bounty.paid ? "Yes" : "No",
      })),
    [filtered, weekMap],
  );

  const totals = {
    totalRun: data.bounties.length,
    totalClaimed: data.bounties.filter((bounty) => bounty.status === "claimed").length,
    totalPaidKes: data.bounties.reduce(
      (total, bounty) => total + (bounty.paid ? bounty.prize_kes : 0),
      0,
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bounty operations"
        title="All bounties"
        description="Filter live, claimed, draft, and cancelled bounties, settle outstanding payouts, and export the working list."
        actions={
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadCsv("marketing-bounties.csv", exportRows)}
          >
            Export CSV
          </button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total bounties run" value={String(totals.totalRun)} />
        <StatCard label="Claimed" value={String(totals.totalClaimed)} />
        <StatCard label="Paid out" value={formatKes(totals.totalPaidKes)} />
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setTab(status)}
                className={
                  tab === status
                    ? "btn-secondary min-h-9 px-3 py-2 text-xs"
                    : "btn-ghost min-h-9 px-3 py-2 text-xs"
                }
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>

          <select
            className="field-base max-w-xs"
            value={weekFilter}
            onChange={(event) => setWeekFilter(event.target.value)}
          >
            <option value="all">All weeks</option>
            {data.weeks.map((week) => (
              <option key={week.id} value={week.id}>
                Week {week.week_number} - {week.tournament_game}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 table-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[var(--text-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Game</th>
                <th className="px-4 py-3 font-semibold">Prize</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Winner</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bounty) => (
                <tr key={bounty.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-white">
                    Week {weekMap[bounty.week_id]?.week_number ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{bounty.title}</p>
                      {bounty.rolled_over_to_week_id ? (
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Rolled over to Week{" "}
                          {weekMap[bounty.rolled_over_to_week_id]?.week_number ?? "?"}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {bounty.game ? <GameChip game={bounty.game} /> : "Platform"}
                  </td>
                  <td className="px-4 py-3 text-white">{formatKes(bounty.prize_kes)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bounty.status} />
                  </td>
                  <td className="px-4 py-3 text-white">{bounty.winner_name ?? "-"}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {bounty.winner_phone ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bounty.paid ? "paid" : "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    {bounty.status === "claimed" && !bounty.paid ? (
                      <button
                        type="button"
                        onClick={() => markPaid(bounty)}
                        className="btn-secondary min-h-9 px-3 py-2 text-xs"
                        disabled={isPending}
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        -
                      </span>
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
